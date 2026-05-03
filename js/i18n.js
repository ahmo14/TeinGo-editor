import tr from './locales/tr.js';
import en from './locales/en.js';
import de from './locales/de.js';
import fr from './locales/fr.js';
import it from './locales/it.js';
import es from './locales/es.js';
import pl from './locales/pl.js';
import ro from './locales/ro.js';
import hu from './locales/hu.js';
import bg from './locales/bg.js';
import cs from './locales/cs.js';

export const locales = {
  tr,
  en,
  de,
  fr,
  it,
  es,
  pl,
  ro,
  hu,
  bg,
  cs,
};

export function getLang() {
  return document.documentElement.lang || 'en';
}

export function t(key, params = {}) {
  const lang = getLang();
  const keys = key.split('.');
  
  let result = locales[lang];
  if (!result) result = locales['en'];
  
  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k];
    } else {
      result = null;
      break;
    }
  }
  
  if (!result) {
    result = locales['en'];
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key; 
      }
    }
  }

  if (typeof result === 'string') {
    for (const [p, val] of Object.entries(params)) {
      result = result.replace(`{${p}}`, val);
    }
  }
  
  return result;
}

export function translateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (el.tagName === 'INPUT') {
      el.placeholder = t(key);
    } else {
      el.setAttribute('data-placeholder', t(key));
    }
  });
}
