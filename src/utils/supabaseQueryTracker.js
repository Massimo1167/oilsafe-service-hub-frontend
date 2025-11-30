/**
 * Supabase Query Interceptor
 *
 * Wrapper trasparente del client Supabase che traccia automaticamente
 * tutte le query (select, insert, update, delete, upsert) per monitoraggio performance.
 *
 * Utilizza Proxy JavaScript per intercettare le chiamate senza modificare il codice esistente.
 */

import { trackQuery } from './performanceTracker';

/**
 * Crea versione tracciata del client Supabase
 */
export const createTrackedSupabaseClient = (supabaseClient) => {
  return new Proxy(supabaseClient, {
    get(target, prop) {
      // Intercetta solo il metodo .from() che inizia query builder
      if (prop === 'from') {
        return (tableName) => {
          const queryBuilder = target.from(tableName);
          return wrapQueryBuilder(queryBuilder, tableName);
        };
      }

      // Altri metodi/proprietà passano invariati
      return target[prop];
    }
  });
};

/**
 * Wrappa query builder per tracciare metodi di query
 */
const wrapQueryBuilder = (queryBuilder, tableName, startTime = null, queryType = null) => {
  return new Proxy(queryBuilder, {
    get(target, prop) {
      const original = target[prop];

      // Se non è una funzione, ritorna il valore originale
      if (typeof original !== 'function') {
        return original;
      }

      // Metodi che terminano la catena e ritornano Promise
      const terminatingMethods = ['select', 'insert', 'update', 'delete', 'upsert'];

      // Se è un metodo terminante (che avvia la query vera)
      if (terminatingMethods.includes(prop)) {
        return function (...args) {
          const newStartTime = performance.now();
          const newQueryType = prop;

          // Chiama metodo originale
          const result = original.apply(target, args);

          // Wrappa il risultato per continuare il chain
          return wrapQueryBuilder(result, tableName, newStartTime, newQueryType);
        };
      }

      // Metodi chainable (eq, order, filter, etc.) o esecuzione finale (then, catch)
      return function (...args) {
        const result = original.apply(target, args);

        // Se è .then() o .catch(), la query è in esecuzione
        if (prop === 'then' || prop === 'catch') {
          // Se abbiamo startTime e queryType, significa che stiamo tracciando una query
          if (startTime !== null && queryType !== null) {
            // Wrappa la Promise per tracciare quando si completa
            const wrappedPromise = new Promise((resolve, reject) => {
              result
                .then((response) => {
                  // Track dopo completamento query
                  const rowCount = Array.isArray(response?.data) ? response.data.length :
                                  response?.count !== undefined ? response.count :
                                  response?.data ? 1 : 0;

                  trackQuery(
                    tableName,
                    queryType,
                    `${queryType} on ${tableName}`,
                    startTime,
                    rowCount
                  );

                  resolve(response);
                })
                .catch((error) => {
                  // Track anche errori query
                  trackQuery(
                    tableName,
                    queryType,
                    `${queryType} on ${tableName} (ERROR)`,
                    startTime,
                    0
                  );
                  reject(error);
                });
            });

            // Se è .then, chiamiamo il callback fornito dall'utente
            if (prop === 'then' && args.length > 0) {
              return wrappedPromise.then(args[0], args[1]);
            }
            // Se è .catch, chiamiamo il callback fornito dall'utente
            if (prop === 'catch' && args.length > 0) {
              return wrappedPromise.catch(args[0]);
            }

            return wrappedPromise;
          }

          // Nessun tracking, passa through
          return result;
        }

        // Altri metodi chainable: wrappa il risultato per continuare tracking
        if (result && typeof result === 'object') {
          return wrapQueryBuilder(result, tableName, startTime, queryType);
        }

        return result;
      };
    }
  });
};
