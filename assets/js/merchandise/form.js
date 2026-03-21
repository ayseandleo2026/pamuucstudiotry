import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from "./config.js";

export function createMerchFormController({ dom, tools, ui, basket, trackEvent, currentLanguage }) {
  function syncHiddenFields() {
    basket.updateHiddenFields();
  }

  function validateUpload() {
    if (!dom.uploadInput || !dom.uploadError) {
      return true;
    }

    dom.uploadError.textContent = "";
    const file = dom.uploadInput.files?.[0];
    if (!file) {
      return true;
    }

    const fileName = file.name.toLowerCase();
    const matchesExtension = ACCEPTED_EXTENSIONS.some((extension) => fileName.endsWith(extension));
    if (!matchesExtension) {
      dom.uploadError.textContent = ui.formUploadType;
      return false;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      dom.uploadError.textContent = tools.interpolate(ui.formUploadSize, { size: "10 MB" });
      return false;
    }

    return true;
  }

  async function submit(event) {
    event.preventDefault();

    if (!dom.quoteForm || !dom.formStatus) {
      return;
    }

    if (!basket.getItems().length) {
      dom.formStatus.textContent = ui.formEmptyBasket;
      return;
    }

    if (!validateUpload()) {
      return;
    }

    if (!dom.quoteForm.checkValidity()) {
      dom.quoteForm.reportValidity();
      return;
    }

    const endpoint = dom.quoteForm.getAttribute("action") || "";
    if (!endpoint) {
      dom.formStatus.textContent = ui.formMissingEndpoint;
      return;
    }

    syncHiddenFields();
    const sourceData = new FormData(dom.quoteForm);
    const submitButton = dom.quoteForm.querySelector("button[type='submit']");

    if (submitButton) {
      submitButton.disabled = true;
    }

    dom.formStatus.textContent = ui.formSending;

    const buildSubmissionData = (includeUpload = true) => {
      const submissionData = new FormData();
      submissionData.set("Full name", String(sourceData.get("fullName") || "").trim());
      submissionData.set("Work email", String(sourceData.get("workEmail") || "").trim());
      submissionData.set("Phone", String(sourceData.get("phone") || "").trim());
      submissionData.set("Company", String(sourceData.get("company") || "").trim());
      submissionData.set("Role", String(sourceData.get("role") || "").trim());
      submissionData.set("Country", String(sourceData.get("country") || "").trim());
      submissionData.set("Deadline", String(sourceData.get("deadline") || "").trim());
      submissionData.set("Project notes", String(sourceData.get("projectNotes") || "").trim());
      submissionData.set("Privacy consent", sourceData.get("privacyConsent") ? "Accepted" : "Not accepted");
      submissionData.set(ui.hiddenSelectedProducts, dom.hiddenProductNames?.value || "");
      submissionData.set(ui.hiddenBasketSummary, dom.hiddenBasketSummary?.value || "");
      submissionData.set(ui.hiddenBasketJson, dom.hiddenBasketJson?.value || "");
      submissionData.set(ui.hiddenLanguage, dom.hiddenLanguage?.value || currentLanguage);
      submissionData.set(ui.hiddenSourcePage, dom.hiddenPageUrl?.value || window.location.href);
      submissionData.set(ui.hiddenSubmittedAt, dom.hiddenTimestamp?.value || new Date().toISOString());
      submissionData.set("_subject", "New Pamuuc Studio merchandising request");
      submissionData.set("_replyto", String(sourceData.get("workEmail") || "").trim());

      const upload = sourceData.get("logoArtwork");
      if (includeUpload && upload && typeof upload === "object" && upload.name) {
        submissionData.set("Logo or artwork upload", upload);
      }

      return submissionData;
    };

    const sendRequest = async (payload) => fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: payload
    });

    try {
      let response = await sendRequest(buildSubmissionData(true));
      let usedUploadFallback = false;

      if (!response.ok) {
        let errorMessage = "";
        try {
          const json = await response.json();
          errorMessage = json?.error || json?.errors?.map((item) => item?.message).filter(Boolean).join(" ") || "";
        } catch (_parseError) {
          errorMessage = "";
        }

        const upload = sourceData.get("logoArtwork");
        const hasUpload = Boolean(upload && typeof upload === "object" && upload.name);
        if (hasUpload && /file uploads not permitted/i.test(errorMessage)) {
          response = await sendRequest(buildSubmissionData(false));
          usedUploadFallback = response.ok;
        }

        if (!response.ok) {
          throw new Error(`Merch quote request failed with status ${response.status}`);
        }

        dom.formStatus.textContent = usedUploadFallback ? ui.formSuccessNoUpload : ui.formSuccess;
      } else {
        dom.formStatus.textContent = ui.formSuccess;
      }

      dom.quoteForm.reset();
      basket.clear();
      validateUpload();
      trackEvent(ui.formSubmit, {
        section_name: "merchandise_quote",
        item_name: "formspree"
      });
    } catch (error) {
      console.error("Merchandise quote submission failed", error);
      dom.formStatus.textContent = ui.formError;
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  function bind() {
    if (dom.uploadInput) {
      dom.uploadInput.addEventListener("change", validateUpload);
    }

    if (dom.quoteForm) {
      dom.quoteForm.addEventListener("focusin", () => {
        trackEvent(ui.formStart, {
          section_name: "merchandise_quote",
          item_name: "form_focus"
        });
      }, { once: true });
      dom.quoteForm.addEventListener("submit", submit);
    }
  }

  return {
    bind,
    validateUpload,
    syncHiddenFields
  };
}
