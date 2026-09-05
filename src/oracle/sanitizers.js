function polishReply(text) {
  return String(text || '')
    .replace(/[一-鿿㐀-䶿\u{20000}-\u{2a6df}]/gu, '')
    .replace(/[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/gu, '')
    .replace(/дефолтн[а-яё]*/gi, 'обычный')
    .replace(/([.!?])(?=[А-ЯЁ])/g, '$1 ')
    .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
    .replace(/\s*(\*\*[^*]+\*\*)\s*/g, '\n\n$1\n')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function cleanGrammarReply(text) {
  return String(text || '')
    .replace(/([.!?])\s+(Тип сна|Главный образ|Что сон показывает|Скрытое чувство|О чём предупреждает|Что сделать сейчас|Общий рисунок|Что притягивает|Где трение|Как тебя может считывать человек|Как общаться|Чего не делать|Практика на 3 дня|Смысл|Сила|Тень|В жизни|Практика|Аркан|Код)(?=\s|[:.\n]|$)/g, '$1\n\n$2')
    .replace(/(Тип сна|Главный образ|Что сон показывает|Скрытое чувство|О чём предупреждает|Что сделать сейчас|Общий рисунок|Что притягивает|Где трение|Как тебя может считывать человек|Как общаться|Чего не делать|Практика на 3 дня|Смысл|Сила|Тень|В жизни|Практика|Аркан|Код)\r?\n([а-яё])/g, function(_match, heading, letter) {
      return heading + '\n' + letter.toUpperCase();
    })
    .replace(/^([^,\n]{2,40}),\s*(тип сна|смысл|главный образ|что видно|общий рисунок|аркан|код|лунный фон)(?=\s|[:.\n]|$)/iu, function(_match, name, heading) {
      return name + ', смотрю.\n\n' + heading.charAt(0).toUpperCase() + heading.slice(1);
    })
    .replace(/\bВаша психика\b/g, 'Твоя психика')
    .replace(/\bваша психика\b/g, 'твоя психика')
    .replace(/\bВаше\b/g, 'Твоё')
    .replace(/\bваше\b/g, 'твоё')
    .replace(/\bВаша\b/g, 'Твоя')
    .replace(/\bваша\b/g, 'твоя')
    .replace(/\bВаши\b/g, 'Твои')
    .replace(/\bваши\b/g, 'твои')
    .replace(/\bВаш\b/g, 'Твой')
    .replace(/\bваш\b/g, 'твой')
    .replace(/\bВас\b/g, 'тебя')
    .replace(/\bвас\b/g, 'тебя')
    .replace(/\bВам\b/g, 'тебе')
    .replace(/\bвам\b/g, 'тебе')
    .replace(/\bВашего\b/g, 'твоего')
    .replace(/\bвашего\b/g, 'твоего')
    .replace(/\bВашему\b/g, 'твоему')
    .replace(/\bвашему\b/g, 'твоему')
    .replace(/\bВашим\b/g, 'твоим')
    .replace(/\bвашим\b/g, 'твоим')
    .replace(/\bВашем\b/g, 'твоём')
    .replace(/\bвашем\b/g, 'твоём')
    .replace(/\bв твоей карт дня\b/gi, 'в твоей карте дня')
    .replace(/\bв твоей карт[ае] дня\b/gi, 'в твоей карте дня')
    .replace(/\bнакопленное усталость\b/gi, 'накопленная усталость')
    .replace(/\bнакопленное тревога\b/gi, 'накопленная тревога')
    .replace(/\bнакопленное напряжение\b/gi, 'накопленное напряжение')
    .replace(/\bнакопленную напряжение\b/gi, 'накопленное напряжение')
    .replace(/\bв внешн/gi, 'во внешн')
    .replace(/\bчувствуем в тебя\b/gi, 'чувствуют в тебе')
    .replace(/\bмасмой\b/gi, 'маской')
    .replace(/\bсигналазирует\b/gi, 'сигнализирует')
    .replace(/\bпродолжайшь\b/gi, 'продолжаешь')
    .replace(/\bначнешь\b/gi, 'начнёшь')
    .replace(/\bчувствовал\(а\) себя\b/gi, 'было ощущение себя')
    .replace(/\bсделал\(а\)\b/gi, 'сделано')
    .replace(/\bготов\(а\)\b/gi, 'есть готовность')
    .replace(/\bуверенным\(ой\)\b/gi, 'увереннее')
    .replace(/\bгнетет\b/gi, 'гнёт')
    .replace(/\badrenaline\b/gi, 'адреналине')
    .replace(/\bacted\b/gi, 'сработал')
    .replace(/\bпривычный рубашку\b/gi, 'привычную оболочку')
    .replace(/\bне пытайтесь\b/gi, 'не пытайся')
    .replace(/\bпытайтесь\b/gi, 'пытайся')
    .replace(/\bиспользуйте\b/gi, 'используй')
    .replace(/\bговорите\b/gi, 'говори')
    .replace(/\bизбегайте\b/gi, 'избегай')
    .replace(/\bпризнайте\b/gi, 'признай')
    .replace(/\bпрактикуйте\b/gi, 'практикуй')
    .replace(/\bзанимайтесь\b/gi, 'занимайся')
    .replace(/\bпрактикуйте\b/gi, 'практикуй')
    .replace(/\bобратите внимание\b/gi, 'обрати внимание')
    .replace(/\bпроверьте\b/gi, 'проверь')
    .replace(/\bзапишите\b/gi, 'запиши')
    .replace(/\bсделайте\b/gi, 'сделай')
    .replace(/\bназовите\b/gi, 'назови')
    .replace(/\bотложите\b/gi, 'отложи')
    .replace(/\bпримите\b/gi, 'прими')
    .replace(/\bпозвольте\b/gi, 'позволь')
    .replace(/(^|[^А-Яа-яЁё])Примите(?=$|[^А-Яа-яЁё])/g, '$1Прими')
    .replace(/(^|[^А-Яа-яЁё])примите(?=$|[^А-Яа-яЁё])/g, '$1прими')
    .replace(/\bслишком мало действуй\b/gi, 'слишком мало действуешь')
    .replace(/\bты рискуешь потерять энергию на то, чтобы просто жить\b/gi, 'ты рискуешь тратить энергию вместо того, чтобы просто жить')
    .replace(/\bчто происходит\?/gi, 'что происходит?')
    .replace(/([.!?]\s+)что я /gi, '$1Что я ')
    .replace(/(^|[^А-Яа-яЁё])Вас(?=$|[^А-Яа-яЁё])/g, '$1тебя')
    .replace(/(^|[^А-Яа-яЁё])вас(?=$|[^А-Яа-яЁё])/g, '$1тебя')
    .replace(/(^|[^А-Яа-яЁё])Вам(?=$|[^А-Яа-яЁё])/g, '$1тебе')
    .replace(/(^|[^А-Яа-яЁё])вам(?=$|[^А-Яа-яЁё])/g, '$1тебе')
    .replace(/(^|[^А-Яа-яЁё])Ваш(?=$|[^А-Яа-яЁё])/g, '$1твой')
    .replace(/(^|[^А-Яа-яЁё])ваш(?=$|[^А-Яа-яЁё])/g, '$1твой')
    .replace(/(^|[^А-Яа-яЁё])Ваша(?=$|[^А-Яа-яЁё])/g, '$1твоя')
    .replace(/(^|[^А-Яа-яЁё])ваша(?=$|[^А-Яа-яЁё])/g, '$1твоя')
    .replace(/(^|[^А-Яа-яЁё])Ваше(?=$|[^А-Яа-яЁё])/g, '$1твоё')
    .replace(/(^|[^А-Яа-яЁё])ваше(?=$|[^А-Яа-яЁё])/g, '$1твоё')
    .replace(/(^|[^А-Яа-яЁё])Ваши(?=$|[^А-Яа-яЁё])/g, '$1твои')
    .replace(/(^|[^А-Яа-яЁё])ваши(?=$|[^А-Яа-яЁё])/g, '$1твои')
    .replace(/(^|[^А-Яа-яЁё])используйте(?=$|[^А-Яа-яЁё])/gi, '$1используй')
    .replace(/(^|[^А-Яа-яЁё])говорите(?=$|[^А-Яа-яЁё])/gi, '$1говори')
    .replace(/(^|[^А-Яа-яЁё])избегайте(?=$|[^А-Яа-яЁё])/gi, '$1избегай')
    .replace(/(^|[^А-Яа-яЁё])не пытайтесь(?=$|[^А-Яа-яЁё])/gi, '$1не пытайся')
    .replace(/(^|[^А-Яа-яЁё])практикуйте(?=$|[^А-Яа-яЁё])/gi, '$1практикуй')
    .replace(/(^|[^А-Яа-яЁё])признайте(?=$|[^А-Яа-яЁё])/gi, '$1признай');
}

function cleanExternalReferencesReply(text, b) {
  var reply = String(text || '')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/^\s*(источник|источники|ссылка|ссылки|литература|references?)\s*:.*$/gim, '')
    .replace(/^\s*[-*]\s*(источник|ссылка)\s*:.*$/gim, '');

  var message = String(b?.message || '');
  var cardAsked = /карт[ауы] дня|таро|аркан|расклад/i.test(message);
  var dailyTarot = String(b?.dailyTarot || '').trim();
  var dailyRune = String(b?.dailyRune || '').trim();
  var dailyTarotName = dailyTarot.split(/[—-]/)[0].trim();
  var dailyRuneName = dailyRune.replace(/^[^\s]+\s+/, '').split(/[—-]/)[0].trim();
  var dailyTarotStem = dailyTarotName.length > 4 ? dailyTarotName.slice(0, -1).toLowerCase() : '';
  var dailyRuneStem = dailyRuneName.length > 4 ? dailyRuneName.slice(0, -1).toLowerCase() : '';
  var sourcePatterns = [
    /источник/i,
    /ссылк/i,
    /литератур/i,
    /на сайт/i,
    /перейд/i,
    /читай/i,
    /согласно/i,
    /по данным/i
  ];
  var cardSourcePatterns = [
    /по карт[еы] дня/i,
    /исходя из карт[ыи] дня/i,
    /карт[ауы] дня показывает/i,
    /главная карт[ауы] дня/i,
    /в карт[еы] дня видно/i,
    /карт[ауы]\s+тебе\s+шепч/i,
    /карт[ауы]\s+говор/i,
    /карт[ауы]\s+указывает/i,
    /в\s+карт[еы]\s+видно/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      if (sourcePatterns.some(function(pattern) { return pattern.test(sentence); })) return false;
      if (b?.requestMode === 'oracle' && !cardAsked) {
        if (cardSourcePatterns.some(function(pattern) { return pattern.test(sentence); })) return false;
        if (dailyTarot && sentence.toLowerCase().includes(dailyTarot.toLowerCase())) return false;
        if (dailyRune && sentence.toLowerCase().includes(dailyRune.toLowerCase())) return false;
        if (dailyTarotName && sentence.toLowerCase().includes(dailyTarotName.toLowerCase())) return false;
        if (dailyRuneName && sentence.toLowerCase().includes(dailyRuneName.toLowerCase())) return false;
        if (dailyTarotStem && sentence.toLowerCase().includes(dailyTarotStem)) return false;
        if (dailyRuneStem && sentence.toLowerCase().includes(dailyRuneStem)) return false;
        if (/(эта|данная|главная)\s+карт[ауы]|аркана?|рун[аы]/i.test(sentence)) return false;
      }
      return true;
    })
    .join(' ');

  if (b?.requestMode === 'oracle' && !cardAsked) {
    cleaned = cleaned
      .replace(/\bОна показывает, что\b/g, 'В ситуации видно, что')
      .replace(/\bона показывает, что\b/g, 'в ситуации видно, что')
      .replace(/\bОна говорит\b/g, 'Внутренний голос говорит')
      .replace(/\bона говорит\b/g, 'внутренний голос говорит')
      .replace(/\bОна шепчет\b/g, 'Внутренний голос шепчет')
      .replace(/\bона шепчет\b/g, 'внутренний голос шепчет');
  }

  return cleaned.length > 120 ? cleaned : reply;
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\n{2,}/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map(function(part) { return part.trim(); })
    .filter(Boolean);
}

function cleanRuneReply(text, b) {
  var reply = String(text || '');
  var isRuneMode = b.requestMode === 'rune_code'
    || (b.requestMode === 'profile_item' && /рун/i.test(String(b.profileFocus?.section || '')))
    || (b.requestMode === 'oracle' && /рун/i.test(String(b.message || '')));
  if (!isRuneMode) return reply;

  reply = reply
    .replace(/^Руны здесь выступают[^.!?]*[.!?]\s*/i, '')
    .replace(/^Руна здесь выступает[^.!?]*[.!?]\s*/i, '')
    .replace(/^Руническая модель здесь[^.!?]*[.!?]\s*/i, '');

  var runeNames = [b.birthRune, b.dailyRune]
    .filter(Boolean)
    .map(function(value) { return String(value).split(/[—-]/)[0].trim(); })
    .filter(Boolean);

  var hasRune = /рун|Иггдрасил|Райдо|Феху|Уруз|Турисаз|Ансуз|Кеназ|Гебо|Вуньо|Хагалаз|Наутиз|Иса|Йера|Эйваз|Перт|Альгиз|Соулу|Тейваз|Беркана|Эваз|Манназ|Лагуз|Ингуз|Дагаз|Отал/i.test(reply)
    || runeNames.some(function(name) { return name && reply.toLowerCase().includes(name.toLowerCase()); });

  if (!hasRune) return reply;

  var forbidden = [
    /сфир/i, /каббал/i, /Малкут/i, /Гвур/i, /Тиферет/i, /Кетер/i, /Хокм/i,
    /Бин[аы]/i, /Хесед/i, /Нецах/i, /Ход/i, /Йесод/i,
    /чакр/i, /Муладхар/i, /Свадхистан/i, /Манипур/i, /Анахат/i, /Вишудх/i, /Аджн/i, /Сахасрар/i,
    /Лун/i, /лун/i, /карта дня/i, /Колесниц/i, /Маг/i, /Император/i,
    /Овн[а-яё]*/i, /Тельц[а-яё]*/i, /Близнец[а-яё]*/i, /Рак[а-яё]*/i, /Льв[а-яё]*/i, /Дев[а-яё]*/i, /Вес[а-яё]*/i, /Скорпион[а-яё]*/i, /Стрельц[а-яё]*/i, /Козерог[а-яё]*/i, /Водол[а-яё]*/i, /Рыб[а-яё]*/i,
    /Марс/i, /Венер/i, /Меркур/i, /Юпитер/i, /Сатурн/i, /Солнц/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  if (cleaned && !/Иггдрасил/i.test(cleaned)) {
    cleaned += ' В образе Иггдрасиля это путь по стволу: корни держат память, а ветви показывают возможные исходы.';
  }

  return cleaned || reply;
}

function cleanTotemReply(text, b) {
  var reply = String(text || '');
  if (b?.requestMode === 'dialogue_energy') return reply;

  var totemName = String(b.totem || '').split(/[—-]/)[0].trim();
  var hasTotem = /тотем|животн/i.test(reply)
    || (totemName && reply.toLowerCase().includes(totemName.toLowerCase()));

  if (!hasTotem) return reply;

  var forbidden = [
    /рун/i, /Иггдрасил/i, /Райдо/i, /Феху/i, /Уруз/i, /Турисаз/i, /Ансуз/i, /Кеназ/i, /Гебо/i, /Вуньо/i,
    /сфир/i, /каббал/i, /Малкут/i, /Гвур/i, /Тиферет/i, /Кетер/i, /Хокм/i, /Бин[аы]/i, /Хесед/i, /Нецах/i, /Ход/i, /Йесод/i,
    /чакр/i, /Муладхар/i, /Свадхистан/i, /Манипур/i, /Анахат/i, /Вишудх/i, /Аджн/i, /Сахасрар/i,
    /Лун/i, /лун/i, /карта дня/i, /Колесниц/i, /Маг/i, /Император/i,
    /Овн[а-яё]*/i, /Тельц[а-яё]*/i, /Близнец[а-яё]*/i, /Рак[а-яё]*/i, /Льв[а-яё]*/i, /Дев[а-яё]*/i, /Вес[а-яё]*/i, /Скорпион[а-яё]*/i, /Стрельц[а-яё]*/i, /Козерог[а-яё]*/i, /Водол[а-яё]*/i, /Рыб[а-яё]*/i,
    /Марс/i, /Венер/i, /Меркур/i, /Юпитер/i, /Сатурн/i, /Солнц/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  if (cleaned && totemName && (!cleaned.toLowerCase().includes(totemName.toLowerCase()) || /^(он|она|его|её)\b/i.test(cleaned))) {
    cleaned = `${b.userName || 'Твой'} тотем — ${totemName}. ` + cleaned;
  }

  return cleaned || reply;
}

function cleanMoonPositionReply(text) {
  if (arguments.length > 1 && arguments[1]?.requestMode === 'moon') return String(text || '');

  var moonPositionPatterns = [
    /растущ[а-яё\s]+лун/i,
    /убывающ[а-яё\s]+лун/i,
    /новолун/i,
    /полнолун/i,
    /лунн[а-яё\s-]*(день|ритм|фаз|цикл|календар)/i,
    /положени[а-яё\s]+лун/i,
    /лун[а-яё\s]+сегодня/i,
    /фаз[а-яё\s]+лун/i
  ];

  return splitSentences(text)
    .filter(function(sentence) {
      return !moonPositionPatterns.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ') || text;
}

function cleanUnrequestedLayerReply(text, b) {
  var reply = String(text || '');
  if (!b || b.requestMode !== 'oracle') return reply;

  var message = String(b.message || '');
  var checks = [
    {
      asked: /астролог|знак|зодиак|козерог|овен|телец|близнец|рак|лев|дева|весы|скорпион|стрелец|водолей|рыб|сатурн|юпитер|марс|венер|меркур|солнц/i,
      patterns: [/Козерог/i, /Овен/i, /Телец/i, /Близнец/i, /Рак/i, /Лев/i, /Дев[аы]/i, /Весы/i, /Скорпион/i, /Стрелец/i, /Водолей/i, /Рыбы/i, /Сатурн/i, /Юпитер/i, /Марс/i, /Венер/i, /Меркур/i, /Солнц/i]
    },
    {
      asked: /каббал|сфир|малкут|гвур|тиферет|кетер|хокм|бин|хесед|нецах|йесод/i,
      patterns: [/сфир/i, /каббал/i, /Малкут/i, /Гвур/i, /Тиферет/i, /Кетер/i, /Хокм/i, /Бин[аы]/i, /Хесед/i, /Нецах/i, /Ход/i, /Йесод/i]
    },
    {
      asked: /рун|иггдрасил|феху|уруз|турисаз|ансуз|райдо|кеназ|гебо|вуньо|хагалаз|наутиз|иса|йера|эйваз|перт|альгиз|соулу|тейваз|беркана|эваз|манназ|лагуз|ингуз|дагаз|отал/i,
      patterns: [/рун/i, /Иггдрасил/i, /Феху/i, /Уруз/i, /Турисаз/i, /Ансуз/i, /Райдо/i, /Кеназ/i, /Гебо/i, /Вуньо/i, /Хагалаз/i, /Наутиз/i, /Иса/i, /Йера/i, /Эйваз/i, /Перт/i, /Альгиз/i, /Соулу/i, /Тейваз/i, /Беркана/i, /Эваз/i, /Манназ/i, /Лагуз/i, /Ингуз/i, /Дагаз/i, /Отал/i]
    },
    {
      asked: /чакр|муладхар|свадхистан|манипур|анахат|вишудх|аджн|сахасрар/i,
      patterns: [/чакр/i, /Муладхар/i, /Свадхистан/i, /Манипур/i, /Анахат/i, /Вишудх/i, /Аджн/i, /Сахасрар/i]
    },
    {
      asked: /нумер|числ|персональн/i,
      patterns: [/нумер/i, /числ[оауы]/i, /персональн/i]
    },
    {
      asked: /тотем|животн/i,
      patterns: [/тотем/i, /животн/i]
    }
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !checks.some(function(check) {
        return !check.asked.test(message) && check.patterns.some(function(pattern) {
          return pattern.test(sentence);
        });
      });
    })
    .join(' ');

  return cleaned.length > 250 ? cleaned : reply;
}

function cleanHiddenModelTermsReply(text, b) {
  var reply = String(text || '');
  var message = String(b?.message || '');
  var focus = [
    message,
    b?.profileFocus?.section || '',
    b?.profileFocus?.label || '',
    b?.profileFocus?.value || '',
    b?.matrixFocus?.label || ''
  ].join(' ');
  var directRequest = /моносов|атлантид|точк[аи]\s+сборк|сефир|дерев[оа]\s+сефир|каст[аы]|эгрегор|фаербол|договор|кокон/i.test(focus);
  if (directRequest) return reply;

  var forbidden = [
    /Моносов/i,
    /Атлантид/i,
    /точк[аи]\s+сборк/i,
    /ТС\b/i,
    /фаербол/i,
    /каст[аы]/i,
    /эгрегор/i,
    /Договор/i,
    /ментальн[а-яё\s]+план/i,
    /астральн[а-яё\s]+план/i,
    /эфирн[а-яё\s]+план/i,
    /кокон/i,
    /Союзник[а-яё]*/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  return cleaned.length > 180 ? cleaned : reply
    .replace(/по\s+модел[иью]\s+Моносова/gi, '')
    .replace(/модель\s+Моносова/gi, 'внутренняя карта')
    .replace(/Моносов[а-яё]*/gi, '')
    .replace(/школ[аы]\s+Атлантид[а-яё]*/gi, '')
    .replace(/Точка Сборки/g, 'точка внимания')
    .replace(/точка сборки/gi, 'точка внимания')
    .replace(/\bТС\b/g, 'внимание')
    .replace(/астральн[а-яё\s]+план[а-яё]*/gi, 'образное восприятие')
    .replace(/ментальн[а-яё\s]+план[а-яё]*/gi, 'уровень смысла')
    .replace(/эфирн[а-яё\s]+план[а-яё]*/gi, 'телесный уровень')
    .replace(/каст[аы]/gi, 'ступень опыта')
    .replace(/Договор/g, 'общие правила')
    .replace(/кокон/gi, 'личные границы')
    .replace(/эгрегор/gi, 'давление среды');
}

function cleanDialogueEnergyReply(text, b) {
  var reply = String(text || '');
  if (!b || b.requestMode !== 'dialogue_energy') return reply;

  var forbidden = [
    /тотем/i, /животн/i, /волк/i, /лис/i, /медвед/i, /олень/i, /сокол/i,
    /рун/i, /Иггдрасил/i, /сфир/i, /каббал/i, /таро/i, /зодиак/i, /нумер/i, /Лун/i, /лун/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  return cleaned.length > 250 ? cleaned : reply;
}

function cleanBondReply(text, b) {
  var reply = String(text || '');
  if (!b || b.requestMode !== 'bond_analysis') return reply;

  return reply
    .replace(/(Общий рисунок|Что притягивает|Где трение|Как тебя может считывать человек|Как общаться|Чего не делать|Практика на 3 дня)\n([а-яё])/g, function(_match, heading, letter) {
      return heading + '\n' + letter.toUpperCase();
    })
    .replace(/\bтебя тянет друг к другу\b/gi, 'вас тянет друг к другу')
    .replace(/\bтебя объединяет\b/gi, 'вас объединяет')
    .replace(/\bтебе обоим\b/gi, 'вам обоим')
    .replace(/\bкто-то из тебя\b/gi, 'кто-то из вас')
    .replace(/\bни один из тебя\b/gi, 'никто из вас')
    .replace(/\bты будете\b/gi, 'ты будешь')
    .replace(/\bЧастаяManipура\b/gi, 'Манипура')
    .replace(/\bManipура\b/gi, 'Манипура')
    .replace(/\bоба партнера\b/gi, 'оба человека')
    .replace(/\bпартнера молчанием\b/gi, 'человека молчанием')
    .replace(/\bбез подковок\b/gi, 'без подколов')
    .replace(/\bваш общий язык\b/gi, 'общий язык пары')
    .replace(/(^|[^А-Яа-яЁё])Не проверяйте(?=$|[^А-Яа-яЁё])/g, '$1Не проверяй')
    .replace(/(^|[^А-Яа-яЁё])не проверяйте(?=$|[^А-Яа-яЁё])/g, '$1не проверяй')
    .replace(/(^|[^А-Яа-яЁё])Не прячьте(?=$|[^А-Яа-яЁё])/g, '$1Не прячь')
    .replace(/(^|[^А-Яа-яЁё])не прячьте(?=$|[^А-Яа-яЁё])/g, '$1не прячь')
    .replace(/(^|[^А-Яа-яЁё])Не позволяйте себе(?=$|[^А-Яа-яЁё])/g, '$1Не позволяй себе')
    .replace(/(^|[^А-Яа-яЁё])не позволяйте себе(?=$|[^А-Яа-яЁё])/g, '$1не позволяй себе')
    .replace(/(^|[^А-Яа-яЁё])Не игнорируйте(?=$|[^А-Яа-яЁё])/g, '$1Не игнорируй')
    .replace(/(^|[^А-Яа-яЁё])не игнорируйте(?=$|[^А-Яа-яЁё])/g, '$1не игнорируй')
    .replace(/(^|[^А-Яа-яЁё])Записывайте(?=$|[^А-Яа-яЁё])/g, '$1Записывай')
    .replace(/(^|[^А-Яа-яЁё])записывайте(?=$|[^А-Яа-яЁё])/g, '$1записывай')
    .replace(/(^|[^А-Яа-яЁё])выдавайте(?=$|[^А-Яа-яЁё])/gi, '$1давайте')
    .replace(/\bзамечаете ли вы\b/gi, 'замечай')
    .replace(/\bконтрольировать\b/gi, 'контролировать')
    .replace(/([.!?]\s+)(используй|избегай|записывай|практикуй|говори|признай|давайте|не позволяй|не игнорируй)/g, function(_match, prefix, word) {
      return prefix + word.charAt(0).toUpperCase() + word.slice(1);
    });
}

function ensureNameOpening(text, b) {
  var reply = String(text || '').trim();
  var name = String(b?.userName || '').trim();
  if (!name || reply.toLowerCase().startsWith(name.toLowerCase())) return reply;

  if (/^(Смысл|Сила|Тень|В жизни|Практика|Тип сна|Главный образ|Что видно|Общий рисунок|Аркан|Код|Лунный фон)(?=\s|[:.\n]|$)/i.test(reply)) {
    return `${name}, смотрю.\n\n${reply}`;
  }

  var lowered = reply.charAt(0).toLowerCase() + reply.slice(1);
  return `${name}, ${lowered}`;
}

function cleanMarkdownReply(text) {
  return String(text || '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/^[ \t]*:[ \t]*/gm, '');
}

module.exports = {
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
  cleanMarkdownReply,
  splitSentences
};
