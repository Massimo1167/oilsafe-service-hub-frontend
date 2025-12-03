-- =====================================================
-- Modifica RLS Policy Pianificazioni per User
-- =====================================================
-- Modifica la policy "User read assigned pianificazioni"
-- per rispettare la configurazione globale
-- user_visualizza_tutte_pianificazioni
-- =====================================================

-- DROP della policy esistente
DROP POLICY IF EXISTS "User read assigned pianificazioni" ON public.pianificazioni;

-- CREA nuova policy con controllo configurazione
CREATE POLICY "User read assigned pianificazioni"
    ON public.pianificazioni
    FOR SELECT
    USING (
        -- Se NON è user, può vedere tutto (admin/manager)
        public.get_my_role() != 'user'
        OR
        -- Se è user, controlla configurazione
        (
            public.get_my_role() = 'user' AND (
                -- Controlla se la configurazione permette di vedere tutte
                (
                    SELECT (valore->>'abilitato')::boolean
                    FROM public.app_configurazioni
                    WHERE chiave = 'user_visualizza_tutte_pianificazioni'
                    LIMIT 1
                ) = TRUE
                OR
                -- Altrimenti mostra solo quelle assegnate
                (
                    (
                        SELECT (valore->>'abilitato')::boolean
                        FROM public.app_configurazioni
                        WHERE chiave = 'user_visualizza_tutte_pianificazioni'
                        LIMIT 1
                    ) = FALSE
                    AND
                    (
                        -- User può vedere pianificazioni di fogli che ha creato o a cui è assegnato
                        EXISTS (
                            SELECT 1 FROM public.fogli_assistenza fa
                            WHERE fa.id = pianificazioni.foglio_assistenza_id
                              AND (fa.creato_da_user_id = auth.uid() OR fa.assegnato_a_user_id = auth.uid())
                        )
                        OR
                        -- Oppure se è tra i tecnici assegnati alla pianificazione
                        auth.uid() = ANY(
                            SELECT t.user_id FROM public.tecnici t
                            WHERE t.id = ANY(pianificazioni.tecnici_assegnati)
                              AND t.user_id IS NOT NULL
                        )
                    )
                )
            )
        )
    );

-- Verifica policy
SELECT policyname, tablename, cmd, qual
FROM pg_policies
WHERE tablename = 'pianificazioni' AND policyname = 'User read assigned pianificazioni';
