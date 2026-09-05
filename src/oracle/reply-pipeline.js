const {
  polishReply,
  cleanGrammarReply,
  cleanExternalReferencesReply,
  cleanRuneReply,
  cleanTotemReply,
  cleanMoonPositionReply,
  cleanUnrequestedLayerReply,
  cleanHiddenModelTermsReply,
  cleanDialogueEnergyReply,
  cleanBondReply,
  ensureNameOpening,
  cleanMarkdownReply
} = require('./sanitizers');
const { cleanNonCrisisClinicalReply } = require('./safety');

function normalizeRawReply(text, b) {
  let rawReply = text || 'Звёзды молчат... Попробуй позже.';
  rawReply = rawReply
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  if (!rawReply) rawReply = 'Звёзды молчат... Попробуй позже.';

  if (b.userName) {
    rawReply = rawReply.replace(/имя\s+тво[её]\s+скрыто[^.]*\./gi, `${b.userName}, Велес видит тебя.`);
    rawReply = rawReply.replace(/имя\s+(неизвестно|не\s+названо|не\s+указано|скрыто)[^.]*\./gi, `${b.userName}, Велес слышит тебя.`);
    rawReply = rawReply.replace(/нет\s+ни\s+имени[^.]*\./gi, '');
    rawReply = rawReply.replace(/не\s+назвал\s+себя[^.]*\./gi, '');
    rawReply = rawReply.replace(/заполни\s+карту[^.]*\./gi, '');
    rawReply = rawReply.replace(/вернись\s+с\s+(точными\s+)?данными[^.]*\./gi, '');
    rawReply = rawReply.replace(/пустот[а-яё]*\s+запроса[^.]*\./gi, '');
  }

  return rawReply;
}

function cleanOracleReply(text, b) {
  const rawReply = normalizeRawReply(text, b);
  const cleanedReply = cleanExternalReferencesReply(
    cleanGrammarReply(
      ensureNameOpening(
        cleanBondReply(
          cleanDialogueEnergyReply(
            cleanUnrequestedLayerReply(
              cleanHiddenModelTermsReply(
                cleanNonCrisisClinicalReply(
                  cleanMoonPositionReply(
                    cleanTotemReply(cleanRuneReply(rawReply, b), b),
                    b
                  ),
                  b
                ),
                b
              ),
              b
            ),
            b
          ),
          b
        ),
        b
      )
    ),
    b
  );

  return polishReply(cleanMarkdownReply(cleanGrammarReply(ensureNameOpening(cleanedReply, b))));
}

module.exports = {
  cleanOracleReply
};
