import { useEffect, useRef } from "react";

const SCRIPT_ID = "gtranslate-script";
const SCRIPT_URL = "https://cdn.gtranslate.net/widgets/latest/dropdown.js";

export default function GTranslate() {
  const wrapperIdRef = useRef(null);
  if (!wrapperIdRef.current) {
    wrapperIdRef.current = "gtranslate_wrapper_" + Math.random().toString(36).slice(2, 10);
  }
  const wrapperId = wrapperIdRef.current;
  const wrapperSelector = "#" + wrapperId;

  useEffect(() => {
    // Function to remove "Select Language" option (keep original function)
    const removeSelectLanguageOption = () => {
      const selects = document.querySelectorAll('.gtranslate_wrapper select, [id^="gtranslate_wrapper_"] select');
      selects.forEach(select => {
        const options = Array.from(select.options);
        options.forEach(option => {
          const text = option.textContent.trim().toLowerCase();
          const value = option.value;
          if (
            value === '' ||
            text === 'select language' ||
            text === 'select a language' ||
            (text.includes('select') && text.includes('language'))
          ) {
            option.remove();
          }
        });
      });
    };

    // Set settings so script finds THIS wrapper when it runs
    const applySettings = () => {
      if (typeof window === "undefined") return;
      window.gtranslateSettings = {
        default_language: "en",
        languages: ["en", "es", "fr", "de", "zh-CN", "ca", "ja", "ru", "ar", "hi", "pt", "it", "nl", "sv", "tr", "vi", "pl", "id", "fa", "th", "cs", "ro", "hu", "el", "da", "fi", "no", "uk"],
        wrapper_selector: wrapperSelector,
        switcher_horizontal_position: "right",
        switcher_vertical_position: "top",
      };
    };

    const injectWidget = () => {
      applySettings();
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        // Script runs on load; re-apply settings and init so it finds our wrapper (fix first-load)
        applySettings();
        if (window.GTranslate && typeof window.GTranslate.init === "function") {
          window.GTranslate.init();
        }
        // Retry init after a short delay in case DOM wasn't ready on first run
        setTimeout(() => {
          applySettings();
          if (window.GTranslate && typeof window.GTranslate.init === "function") {
            window.GTranslate.init();
          }
          removeSelectLanguageOption();
        }, 100);
        setTimeout(removeSelectLanguageOption, 300);
        // First-load fix: if wrapper still empty, script ran before wrapper was ready; re-inject once
        setTimeout(() => {
          const wrapperEl = document.getElementById(wrapperId);
          if (wrapperEl && wrapperEl.children.length === 0) {
            const old = document.getElementById(SCRIPT_ID);
            if (old && old.parentNode) {
              old.parentNode.removeChild(old);
              applySettings();
              const s = document.createElement("script");
              s.id = SCRIPT_ID;
              s.src = SCRIPT_URL;
              s.async = true;
              s.onload = () => {
                applySettings();
                if (window.GTranslate && typeof window.GTranslate.init === "function") {
                  window.GTranslate.init();
                }
                setTimeout(removeSelectLanguageOption, 200);
              };
              document.body.appendChild(s);
            }
          }
        }, 400);
      };
      document.body.appendChild(script);
    };

    // Ensure wrapper is in the DOM before loading script (fix first-load: don't run before React has committed)
    const runAfterMount = (fn) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (document.getElementById(wrapperId)) fn();
          else setTimeout(() => runAfterMount(fn), 50);
        });
      });
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (!existingScript) {
      runAfterMount(injectWidget);
    } else {
      // Script already loaded (e.g. from another navbar). Run after wrapper is in DOM.
      runAfterMount(() => {
        applySettings();
        if (window.GTranslate && typeof window.GTranslate.init === "function") {
          window.GTranslate.init();
        }
        setTimeout(removeSelectLanguageOption, 300);
        // If wrapper still empty, re-load script so it injects into this wrapper
        setTimeout(() => {
          const wrapperEl = document.getElementById(wrapperId);
          if (wrapperEl && wrapperEl.children.length === 0) {
            const old = document.getElementById(SCRIPT_ID);
            if (old && old.parentNode) {
              old.parentNode.removeChild(old);
              injectWidget();
            }
          }
        }, 600);
      });
    }

    // Observe and keep "Select Language" removed (original function)
    const observer = new MutationObserver(() => {
      removeSelectLanguageOption();
    });
    const wrapperEl = document.getElementById(wrapperId);
    if (wrapperEl) {
      observer.observe(wrapperEl, { childList: true, subtree: true });
    }
    const intervalId = setInterval(removeSelectLanguageOption, 600);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [wrapperId, wrapperSelector]);

  return (
    <div
      id={wrapperId}
      className="gtranslate_wrapper ml-10"
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "36px",
        minWidth: "100px",
        visibility: "visible",
      }}
    />
  );
}
