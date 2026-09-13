import { setLocale, translate } from './locales.mjs';
try { setLocale(localStorage.getItem('ramified.site.language') || 'en'); } catch {}
const entry = document.querySelector('[data-workspace-directory]');
if (entry) translate(entry);
