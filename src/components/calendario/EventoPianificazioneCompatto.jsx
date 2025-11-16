import React from 'react';
import PropTypes from 'prop-types';
import { formatNumeroFoglio } from '../../utils/formatters';

/**
 * Componente per visualizzare eventi di pianificazione in formato compatto
 * Mostra solo il numero foglio e la commessa per massimizzare la leggibilità
 */
const EventoPianificazioneCompatto = ({ event }) => {
    const { resource } = event;

    if (!resource) {
        return <span>{event.title}</span>;
    }

    const numeroFoglioAbbreviato = formatNumeroFoglio(resource.numero_foglio);
    const commessa = resource.commessa_descrizione || resource.commessa_codice || 'Nessuna commessa';

    return (
        <div className="evento-pianificazione-compatto">
            <div className="evento-foglio-numero">
                #{numeroFoglioAbbreviato}
            </div>
            <div className="evento-commessa">
                {commessa}
            </div>
        </div>
    );
};

EventoPianificazioneCompatto.propTypes = {
    event: PropTypes.shape({
        title: PropTypes.string,
        resource: PropTypes.shape({
            numero_foglio: PropTypes.string,
            commessa_codice: PropTypes.string,
            commessa_descrizione: PropTypes.string,
            tecnico_id: PropTypes.string,
            tecnico_nome: PropTypes.string,
            commessa_id: PropTypes.string,
        }),
    }).isRequired,
};

export default EventoPianificazioneCompatto;
