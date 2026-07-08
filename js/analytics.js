/* SAB Mobile demo — Amplitude instrumentation layer.
   The SDK itself is loaded in index.html via the unified script loader:
     https://cdn.amplitude.com/script/<KEY>.js            (Analytics + Session Replay + Web Experiment)
     https://cdn.amplitude.com/script/<KEY>.engagement.js (Guides & Surveys)
   Everything here is manual tracking with exact event/property names — the connected
   Amplitude project's charts depend on these keys. Autocapture stays OFF except
   frustration interactions (rage + dead clicks on the broken error screen). */
(function () {
  'use strict';

  var API_KEY = '3a9822aacf2744f18e92c5026ca6d438';

  // in-page log of every manual track call this page load — inspect with
  // window.__SAB_EVENTS__ in the console when checking a demo run
  var eventLog = [];
  window.__SAB_EVENTS__ = eventLog;

  function hasAmplitude() {
    return typeof window.amplitude !== 'undefined' && typeof window.amplitude.track === 'function';
  }

  function init() {
    if (!hasAmplitude()) {
      console.warn('[SAB demo] Amplitude SDK not loaded — check the CDN script tags in index.html');
      return;
    }

    if (window.sessionReplay) {
      window.amplitude.add(window.sessionReplay.plugin({ sampleRate: 1 }));
    } else {
      console.warn('[SAB demo] Session Replay plugin not exposed by the loader');
    }
    if (window.engagement) {
      window.amplitude.add(window.engagement.plugin());
    } else {
      console.warn('[SAB demo] Engagement (Guides & Surveys) plugin not exposed — check the .engagement.js script tag');
    }

    // Autocapture OFF except frustration interactions (rage + dead clicks).
    // Config shape verified against the Amplitude Browser SDK 2 docs + SDK source
    // at build time (July 2026, analytics-browser 2.42.x):
    //  - `frustrationInteractions: true` is the documented key; it emits
    //    [Amplitude] Rage Click / [Amplitude] Dead Click and works independently
    //    of `elementInteractions`.
    //  - attribution/pageViews/sessions/formInteractions/fileDownloads/
    //    pageUrlEnrichment default ON when autocapture is a partial object, so
    //    each is disabled explicitly.
    //  - With fetchRemoteConfig: true (kept per spec — Session Replay/Guides use
    //    it) the project's remote Autocapture settings (Data → Settings →
    //    Autocapture) override this local config per feature: keep them off in
    //    the connected project.
    window.amplitude.init(API_KEY, {
      fetchRemoteConfig: true,
      autocapture: {
        attribution: false,
        pageViews: false,
        sessions: false,
        formInteractions: false,
        fileDownloads: false,
        pageUrlEnrichment: false,
        elementInteractions: false,
        webVitals: false,
        networkTracking: false,
        performanceTracking: false,
        frustrationInteractions: true // rage clicks + dead clicks ONLY
      }
    });

    checkExperimentSdk();
  }

  // The unified "smart loader" only inlines the Web Experiment tag when the
  // project has a deployment attached to it, and exposes it as
  // `window.webExperiment` (stub first, then the real client) — verified against
  // the live loader bundle and experiment-js-client source, July 2026. There is
  // no `window.experiment` global with the CDN loader. Surface the result either
  // way so the presenter knows before going live.
  function checkExperimentSdk() {
    function probe() {
      var we = window.webExperiment;
      if (typeof we !== 'undefined' && we !== null) {
        console.log('[SAB demo] Experiment SDK available' + (we.isStub ? ' (tag stub, client still starting)' : ''));
        var note = document.getElementById('sdk-footer-note');
        if (note) note.hidden = true;
        return true;
      }
      return false;
    }
    if (probe()) return;
    // one late re-check in case the loader is slow before declaring it missing
    setTimeout(function () {
      if (probe()) return;
      console.warn('[SAB demo] Experiment SDK not loaded — add a deployment to the loader. ' +
        'Flag key in the connected project: transfer-error-screen-viewed-reduction');
      var note = document.getElementById('sdk-footer-note');
      if (note) {
        note.textContent = 'Experiment SDK not loaded — add a deployment to the loader';
        note.hidden = false;
      }
    }, 2500);
  }

  function track(name, props) {
    console.info('[SAB demo] track:', name, props || {});
    eventLog.push({ name: name, props: props || {} });
    if (hasAmplitude()) window.amplitude.track(name, props || {});
  }

  // Transfer Completed carries Amplitude's reserved revenue fields. Browser SDK 2's
  // track(eventType, eventProperties, eventOptions) accepts top-level revenue keys
  // (price, quantity, revenue, revenueType) through EventOptions — verified against
  // the SDK 2 docs/BaseEvent type at build time. The same keys are mirrored into
  // event_properties because the connected project's charts read them there too.
  function trackWithRevenue(name, props, rev) {
    var merged = Object.assign({}, props, {
      revenue: rev.revenue,
      price: rev.price,
      quantity: rev.quantity,
      revenueType: rev.revenueType
    });
    console.info('[SAB demo] track:', name, merged, '(+ reserved revenue fields)');
    eventLog.push({ name: name, props: merged, revenue: rev });
    if (hasAmplitude()) {
      window.amplitude.track(name, merged, {
        price: rev.price,
        quantity: rev.quantity,
        revenue: rev.revenue,
        revenueType: rev.revenueType
      });
    }
  }

  // deterministic tier pick so a demo user keeps the same tier across logins
  function pickTier(userId) {
    var tiers = ['premier', 'advance', 'personal'];
    var h = 0;
    for (var i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
    return tiers[h % tiers.length];
  }

  /* Sign-in identity flow — order matters: setUserId, then identify, then Logged In.
     Every property is always set: no live-demo user may ever show "(none)" for
     on_stable_release, app_version, customer_tier, platform, country or any utm_*. */
  function login(userId, isStable, utm) {
    var appVersion = isStable ? '8.1.7' : '8.4.0';
    var tier = pickTier(userId);
    var props = {
      on_stable_release: isStable,
      app_version: appVersion,
      customer_tier: tier,
      platform: 'iOS',
      country: 'SA',
      utm_source: (utm && utm.utm_source) || 'sab_app',
      utm_medium: (utm && utm.utm_medium) || 'direct',
      utm_campaign: (utm && utm.utm_campaign) || 'brand_direct'
    };
    console.info('[SAB demo] setUserId:', userId);
    console.info('[SAB demo] identify:', props);
    if (hasAmplitude()) {
      window.amplitude.setUserId(userId);
      var identify = new window.amplitude.Identify();
      Object.keys(props).forEach(function (k) { identify.set(k, props[k]); });
      window.amplitude.identify(identify);
    }
    track('Logged In', { login_method: 'user_id', app_version: appVersion });
    return { customer_tier: tier, app_version: appVersion };
  }

  function logout(appVersion) {
    var props = { app_version: appVersion };
    console.info('[SAB demo] track:', 'Logged Out', props);
    eventLog.push({ name: 'Logged Out', props: props });
    if (!hasAmplitude()) return;
    // reset() only after the SDK's async pipeline has stamped the signed-in user
    // onto the event — a synchronous reset would attribute Logged Out to a fresh
    // anonymous user (timeout fallback in case the request never settles)
    var done = false;
    function doReset() {
      if (done) return;
      done = true;
      window.amplitude.reset();
    }
    var r = window.amplitude.track('Logged Out', props);
    if (r && r.promise && typeof r.promise.then === 'function') r.promise.then(doReset, doReset);
    setTimeout(doReset, 1500);
  }

  window.SABAnalytics = {
    init: init,
    track: track,
    trackWithRevenue: trackWithRevenue,
    login: login,
    logout: logout
  };
})();
