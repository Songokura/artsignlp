(function () {
  'use strict';
  document.documentElement.classList.add('js');

  // Заявки уходят туда же, куда и с прежней версии сайта: Supabase, функция submit_lead (публичный anon-ключ).
  var SB_URL = 'https://npgpehicessclkhkytyy.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZ3BlaGljZXNzY2xraGt5dHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTY2MjMsImV4cCI6MjA5NzQzMjYyM30.pQc22nBiJU7-tZohr89vD7dVWsLJjOjsPUKpzAHIIME';

  // UTM и метки рекламы - как раньше
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  var SRC = { google: 'Google Ads', g: 'Google Ads', instagram: 'Instagram', ig: 'Instagram', facebook: 'Facebook', fb: 'Facebook', meta: 'Instagram/Facebook', yandex: 'Яндекс', tiktok: 'TikTok', telegram: 'Telegram' };
  var utm = {};
  try {
    var qs = new URLSearchParams(location.search);
    UTM_KEYS.forEach(function (k) { var v = qs.get(k); if (v) utm[k] = v.slice(0, 120); });
    if (Object.keys(utm).length) sessionStorage.setItem('as_utm', JSON.stringify(utm));
    else utm = JSON.parse(sessionStorage.getItem('as_utm') || '{}');
  } catch (e) {}

  function sourceLabel(u) {
    var s = (u.utm_source || '').toLowerCase();
    var r = SRC[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    if (!r) { if (u.gclid) r = 'Google Ads'; else if (u.fbclid) r = 'Instagram/Facebook'; }
    if (!r) return null;
    var out = 'Реклама · ' + r;
    if (u.utm_campaign) out += ' / ' + u.utm_campaign;
    return out.slice(0, 120);
  }
  function note(u) {
    var p = Object.keys(u).map(function (k) { return k + '=' + u[k]; });
    return p.length ? 'Реклама: ' + p.join('; ') : null;
  }

  // Маска 8 (XXX) XXX-XX-XX
  function digits(v) { return (v || '').replace(/\D/g, ''); }
  function fmt(v) {
    var d = digits(v);
    if (!d) return '';
    // первая цифра - префикс 8/+7; вставленный номер из 10 цифр без префикса не режем
    var r = (d.length === 10 && d[0] !== '8') ? d : d.slice(1);
    if (r[0] === '8') r = r.slice(1);              // после подставленного «8 (» человек набрал 8 ещё раз
    if (r.length > 10 && r[0] === '7') r = r.slice(1); // вставили +7XXXXXXXXXX поверх «8 (»
    d = r.slice(0, 10);
    var o = '8';
    if (d.length) o += ' (' + d.slice(0, 3);
    if (d.length >= 3) o += ')';
    if (d.length > 3) o += ' ' + d.slice(3, 6);
    if (d.length > 6) o += '-' + d.slice(6, 8);
    if (d.length > 8) o += '-' + d.slice(8, 10);
    return o;
  }

  var tpl = document.getElementById('lf-done');

  document.querySelectorAll('.lead-form').forEach(function (form) {
    var card = form.closest('[data-form-card]');
    var name = form.elements.name;
    var phone = form.elements.phone;
    var hp = form.elements.company;
    var err = form.querySelector('.lf-err');
    var btn = form.querySelector('button[type=submit]');
    var btnText = btn.querySelector('span');

    phone.addEventListener('input', function () {
      phone.value = fmt(phone.value);
      phone.classList.toggle('is-ok', digits(phone.value).length >= 11);
      phone.classList.remove('is-bad');
    });
    phone.addEventListener('focus', function () { if (!phone.value) phone.value = '8 ('; });
    phone.addEventListener('blur', function () { if (digits(phone.value).length <= 1) phone.value = ''; });
    name.addEventListener('input', function () { name.classList.remove('is-bad'); });

    form.addEventListener('focusin', function () { card && card.classList.add('is-hot'); });
    form.addEventListener('focusout', function () {
      setTimeout(function () { if (card && !form.contains(document.activeElement)) card.classList.remove('is-hot'); }, 0);
    });

    function fail(msg, field) {
      err.textContent = msg; err.hidden = false;
      if (field) { field.classList.add('is-bad'); field.focus(); }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (hp.value) return;
      err.hidden = true;
      if (!name.value.trim()) return fail('Укажите, как к вам обращаться', name);
      if (digits(phone.value).length < 11) return fail('Введите корректный номер телефона', phone);

      btn.disabled = true; btnText.textContent = 'Отправляем…';
      fetch(SB_URL + '/rest/v1/rpc/submit_lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
        body: JSON.stringify({ p_name: name.value.trim(), p_phone: phone.value.trim(), p_source: sourceLabel(utm), p_note: note(utm) })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
        var done = tpl.content.firstElementChild.cloneNode(true);
        form.replaceWith(done);
        var head = card && card.querySelector('.lf-head');
        if (head) head.hidden = true;
        done.focus({ preventScroll: true });
      }).catch(function () {
        btn.disabled = false; btnText.textContent = 'Оставить заявку';
        fail('Не удалось отправить. Попробуйте ещё раз или напишите в WhatsApp.');
      });
    });
  });

  // Кнопки «к форме»: плавно к ближайшей форме, подсветка и фокус в поле имени
  function goToForm(target) {
    var zone = document.getElementById(target) || document.getElementById('zayavka');
    var card = zone.querySelector('[data-form-card]');
    var top = card.getBoundingClientRect().top + window.scrollY - (window.innerHeight - card.offsetHeight) / 2;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () {
      card.classList.remove('is-ping'); void card.offsetWidth; card.classList.add('is-ping');
      var f = card.querySelector('input[name=name]');
      if (f && window.matchMedia('(hover:hover)').matches) f.focus({ preventScroll: true });
    }, reduce ? 0 : 650);
  }
  document.querySelectorAll('.js-to-form').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      goToForm((a.getAttribute('href') || '#zayavka').slice(1));
    });
  });

  // Нижняя панель на телефоне: видна, когда ни одна форма не на экране
  var bar = document.querySelector('[data-mbar]');
  var cards = document.querySelectorAll('[data-form-card]');
  if (bar && 'IntersectionObserver' in window) {
    var vis = new Map();
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { vis.set(en.target, en.isIntersecting); });
      var any = false; vis.forEach(function (v) { if (v) any = true; });
      bar.classList.toggle('is-on', !any && window.scrollY > 200);
    }, { threshold: 0.15 });
    cards.forEach(function (c) { io.observe(c); });
    window.addEventListener('scroll', function () {
      var any = false; vis.forEach(function (v) { if (v) any = true; });
      bar.classList.toggle('is-on', !any && window.scrollY > 200);
    }, { passive: true });
  }

  // Проявление блоков
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { ro.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });
})();
