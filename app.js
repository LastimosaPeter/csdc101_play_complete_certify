(() => {
  "use strict";

  const COURSE = "CSDC101 · Fundamentals of Programming";
  const INSTITUTION = "Ateneo de Naga University";
  const INSTRUCTOR = "Ian Peter L. Lastimosa";
  const GAME_TITLE = "Big Hero 6: Code Baymax";
  // SHA-256 of the six-digit admin code. The plain code is not stored in the page.
  // Note: client-side admin access is a convenience feature, not secure authentication.
  const ADMIN_CODE_HASH = "3e118e888a3961ba8836332b69c23b75f754078aa2a4751ce0997bb1af8d188a";
  const adminSessionKey = "csdc101-code-baymax-admin-mode";

  // Code Baymax internally numbers its levels from 0 to 38. Each location is
  // considered complete when its last level has been completed.
  const LOCATIONS = [
    { id: "garage", name: "Garage", finalLevel: 5 },
    { id: "lab", name: "Lab", finalLevel: 14 },
    { id: "yokai", name: "Yokai", finalLevel: 28 },
    { id: "akuma", name: "Akuma", finalLevel: 38 }
  ];

  const storageKeyForLevel = level => `flambe:level${level}-completed`;
  const completionRecordKey = "csdc101-code-baymax-completion";

  const elements = {
    progressSummary: document.querySelector("#progressSummary"),
    progressBarFill: document.querySelector("#progressBarFill"),
    locationGrid: document.querySelector("#locationGrid"),
    gameFrame: document.querySelector("#gameFrame"),
    gameLoader: document.querySelector("#gameLoader"),
    gameShell: document.querySelector("#gameShell"),
    restartGame: document.querySelector("#restartGame"),
    fullscreenGame: document.querySelector("#fullscreenGame"),
    certificatePanel: document.querySelector("#certificatePanel"),
    lockBanner: document.querySelector("#lockBanner"),
    certificateForm: document.querySelector("#certificateForm"),
    studentName: document.querySelector("#studentName"),
    studentSection: document.querySelector("#studentSection"),
    proofPhoto: document.querySelector("#proofPhoto"),
    fileName: document.querySelector("#fileName"),
    accuracyConsent: document.querySelector("#accuracyConsent"),
    formMessage: document.querySelector("#formMessage"),
    generateCertificate: document.querySelector("#generateCertificate"),
    completionActions: document.querySelector("#completionActions"),
    certificateId: document.querySelector("#certificateId"),
    downloadCertificate: document.querySelector("#downloadCertificate"),
    downloadProof: document.querySelector("#downloadProof"),
    printCertificate: document.querySelector("#printCertificate"),
    resetProgress: document.querySelector("#resetProgress"),
    adminAccess: document.querySelector("#adminAccess"),
    adminDialog: document.querySelector("#adminDialog"),
    adminForm: document.querySelector("#adminForm"),
    adminCode: document.querySelector("#adminCode"),
    adminMessage: document.querySelector("#adminMessage"),
    adminClose: document.querySelector("#adminClose"),
    adminCancel: document.querySelector("#adminCancel"),
    exitAdminMode: document.querySelector("#exitAdminMode"),
    certificateCanvas: document.querySelector("#certificateCanvas"),
    proofCanvas: document.querySelector("#proofCanvas")
  };

  let allLocationsComplete = false;
  let certificateAccessGranted = false;
  let adminMode = sessionStorage.getItem(adminSessionKey) === "active";
  let proofImage = null;
  let currentRecord = null;

  async function sha256(value) {
    if (!window.crypto?.subtle || typeof TextEncoder === "undefined") {
      throw new Error("Admin verification is unavailable in this browser. Use a current browser over HTTPS or localhost.");
    }
    const data = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function openAdminDialog() {
    elements.adminMessage.textContent = "";
    elements.adminCode.value = "";
    if (typeof elements.adminDialog.showModal === "function") {
      elements.adminDialog.showModal();
      setTimeout(() => elements.adminCode.focus(), 50);
    } else {
      elements.adminDialog.setAttribute("open", "");
      elements.adminCode.focus();
    }
  }

  function closeAdminDialog() {
    elements.adminMessage.textContent = "";
    elements.adminCode.value = "";
    if (typeof elements.adminDialog.close === "function") elements.adminDialog.close();
    else elements.adminDialog.removeAttribute("open");
  }

  function scrollToCertificate() {
    elements.certificatePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => elements.studentName.focus({ preventScroll: true }), 550);
  }

  function setAdminMode(enabled) {
    adminMode = Boolean(enabled);
    if (adminMode) sessionStorage.setItem(adminSessionKey, "active");
    else sessionStorage.removeItem(adminSessionKey);
    refreshProgress();
  }

  async function handleAdminSubmit(event) {
    event.preventDefault();
    const code = elements.adminCode.value.replace(/\D/g, "").slice(0, 6);
    elements.adminCode.value = code;
    elements.adminMessage.textContent = "";

    if (code.length !== 6) {
      elements.adminMessage.textContent = "Enter the complete six-digit admin code.";
      return;
    }

    try {
      const codeHash = await sha256(code);
      if (codeHash !== ADMIN_CODE_HASH) {
        elements.adminMessage.textContent = "Incorrect admin code.";
        elements.adminCode.select();
        return;
      }
      setAdminMode(true);
      closeAdminDialog();
      scrollToCertificate();
    } catch (error) {
      console.error(error);
      elements.adminMessage.textContent = error.message || "Unable to verify the admin code.";
    }
  }

  function deserializeFlambeBoolean(value) {
    // Haxe Serializer stores true as "t" and false as "f". Checking the JSON
    // forms as well makes the tracker resilient to repackaged game versions.
    if (value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    return normalized === "t" || normalized === "true" || normalized === "1" || normalized === '"true"';
  }

  function isLevelComplete(level) {
    return deserializeFlambeBoolean(localStorage.getItem(storageKeyForLevel(level)));
  }

  function getLocationState() {
    return LOCATIONS.map((location, index) => ({
      ...location,
      complete: isLevelComplete(location.finalLevel),
      unlocked: index === 0 || isLevelComplete(LOCATIONS[index - 1].finalLevel)
    }));
  }

  function refreshProgress() {
    const states = getLocationState();
    const completedCount = states.filter(item => item.complete).length;
    allLocationsComplete = completedCount === LOCATIONS.length;
    certificateAccessGranted = allLocationsComplete || adminMode;

    states.forEach(state => {
      const card = elements.locationGrid.querySelector(`[data-location="${state.id}"]`);
      const status = card.querySelector(".status-pill");
      card.classList.toggle("is-complete", state.complete);
      card.classList.toggle("is-active", !state.complete && state.unlocked);
      if (state.complete) status.textContent = "Complete";
      else if (state.unlocked) status.textContent = "In progress";
      else status.textContent = "Locked";
    });

    elements.progressSummary.textContent = `${completedCount} of ${LOCATIONS.length} locations complete`;
    elements.progressBarFill.style.width = `${(completedCount / LOCATIONS.length) * 100}%`;
    elements.certificatePanel.classList.toggle("is-locked", !certificateAccessGranted);
    elements.generateCertificate.disabled = !certificateAccessGranted;
    elements.exitAdminMode.hidden = !adminMode;
    elements.adminAccess.classList.toggle("is-active", adminMode);
    elements.adminAccess.querySelector("span:last-child").textContent = adminMode ? "Open certificate" : "Admin mode";
    elements.adminAccess.setAttribute("aria-label", adminMode ? "Admin mode active: open certificate section" : "Open admin mode");

    elements.lockBanner.classList.remove("is-unlocked", "is-admin");
    if (allLocationsComplete) {
      elements.lockBanner.classList.add("is-unlocked");
      elements.lockBanner.querySelector("strong").textContent = "Certificate unlocked";
      elements.lockBanner.querySelector("p").textContent = "All four locations are complete. Enter your details and upload your proof.";
      elements.lockBanner.querySelector(".lock-icon").textContent = "✓";
    } else if (adminMode) {
      elements.lockBanner.classList.add("is-unlocked", "is-admin");
      elements.lockBanner.querySelector("strong").textContent = "Admin access granted";
      elements.lockBanner.querySelector("p").textContent = "The certificate form is available for this tab. Game progress has not been changed.";
      elements.lockBanner.querySelector(".lock-icon").textContent = "A";
    } else {
      elements.lockBanner.querySelector("strong").textContent = "Certificate locked";
      elements.lockBanner.querySelector("p").textContent = "Complete Garage, Lab, Yokai, and Akuma to continue.";
      elements.lockBanner.querySelector(".lock-icon").textContent = "◆";
    }
  }

  function restartGame() {
    elements.gameLoader.classList.remove("is-hidden");
    const url = new URL("game/index.html", window.location.href);
    url.searchParams.set("reload", Date.now().toString());
    elements.gameFrame.src = url.toString();
  }

  async function enterFullscreen() {
    try {
      if (elements.gameShell.requestFullscreen) await elements.gameShell.requestFullscreen();
    } catch (error) {
      console.error("Full screen failed", error);
    }
  }

  function validatePhoto(file) {
    if (!file) return "Upload a completion screenshot or photo.";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Use a JPG, PNG, or WebP image.";
    if (file.size > 8 * 1024 * 1024) return "The proof image must be 8 MB or smaller.";
    return "";
  }

  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read the selected image."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("The selected image could not be opened."));
        image.onload = () => resolve(image);
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function createCertificateId() {
    const date = new Date();
    const datePart = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
    const randomPart = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID().split("-")[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();
    return `CSDC101-CB-${datePart}-${randomPart}`;
  }

  function fitText(context, text, maxWidth, startingSize, minimumSize = 34) {
    let size = startingSize;
    do {
      context.font = `700 ${size}px Georgia, serif`;
      if (context.measureText(text).width <= maxWidth) break;
      size -= 2;
    } while (size > minimumSize);
    return size;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCertificate(record, image) {
    const canvas = elements.certificateCanvas;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#f7fafb";
    ctx.fillRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#102332");
    gradient.addColorStop(.58, "#174b5d");
    gradient.addColorStop(1, "#9c2037");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, 185);

    ctx.strokeStyle = "#c9283e";
    ctx.lineWidth = 16;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.strokeStyle = "#dba52e";
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, w - 100, h - 100);

    ctx.fillStyle = "rgba(201,40,62,.07)";
    ctx.beginPath(); ctx.arc(w - 150, h - 115, 280, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(12,117,131,.07)";
    ctx.beginPath(); ctx.arc(120, h - 70, 220, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 30px Arial, sans-serif";
    ctx.fillText(COURSE.toUpperCase(), w / 2, 78);
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillStyle = "#c9e9ec";
    ctx.fillText(INSTITUTION, w / 2, 120);

    ctx.fillStyle = "#17222f";
    ctx.font = "700 42px Georgia, serif";
    ctx.fillText("CERTIFICATE OF COMPLETION", w / 2, 280);
    ctx.fillStyle = "#5d6875";
    ctx.font = "400 24px Arial, sans-serif";
    ctx.fillText("This certificate is presented to", w / 2, 347);

    const nameSize = fitText(ctx, record.name, 1260, 76, 42);
    ctx.font = `700 ${nameSize}px Georgia, serif`;
    ctx.fillStyle = "#941d31";
    ctx.fillText(record.name, w / 2, 450);
    ctx.strokeStyle = "#dba52e";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(240, 478); ctx.lineTo(w - 240, 478); ctx.stroke();

    ctx.fillStyle = "#34414c";
    ctx.font = "400 25px Arial, sans-serif";
    ctx.fillText(`of ${record.section}`, w / 2, 535);
    ctx.fillText("for successfully completing all four locations in", w / 2, 596);
    ctx.font = "700 39px Arial, sans-serif";
    ctx.fillStyle = "#0c7583";
    ctx.fillText(GAME_TITLE, w / 2, 652);

    const badgeY = 722;
    const badgeWidth = 250;
    const badgeGap = 24;
    const totalWidth = badgeWidth * 4 + badgeGap * 3;
    const startX = (w - totalWidth) / 2;
    LOCATIONS.forEach((location, index) => {
      const x = startX + index * (badgeWidth + badgeGap);
      roundedRect(ctx, x, badgeY, badgeWidth, 88, 18);
      ctx.fillStyle = index % 2 === 0 ? "#e7f6ee" : "#dff5f7";
      ctx.fill();
      ctx.strokeStyle = index % 2 === 0 ? "#83c9a7" : "#8bcbd2";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = index % 2 === 0 ? "#18794e" : "#075d68";
      ctx.font = "800 22px Arial, sans-serif";
      ctx.fillText(`✓ ${location.name}`, x + badgeWidth / 2, badgeY + 54);
    });

    ctx.fillStyle = "#5d6875";
    ctx.font = "400 20px Arial, sans-serif";
    ctx.fillText(`Completed on ${record.dateLabel}`, w / 2, 875);

    // Add a small, lossless proof-image thumbnail to the certificate. The
    // source image is center-cropped to a square and never stretched or warped.
    if (image) {
      const proofSize = 140;
      const proofX = 75;
      const proofY = 825;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(proofX - 6, proofY - 6, proofSize + 12, proofSize + 12);
      ctx.save();
      ctx.beginPath();
      ctx.rect(proofX, proofY, proofSize, proofSize);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      drawCoverImage(ctx, image, proofX, proofY, proofSize, proofSize);
      ctx.restore();

      ctx.strokeStyle = "#c9283e";
      ctx.lineWidth = 3;
      ctx.strokeRect(proofX - 1.5, proofY - 1.5, proofSize + 3, proofSize + 3);
      ctx.textAlign = "center";
      ctx.fillStyle = "#5d6875";
      ctx.font = "700 14px Arial, sans-serif";
      ctx.fillText("PROOF OF COMPLETION", proofX + proofSize / 2, proofY + proofSize + 27);
    }

    ctx.strokeStyle = "#87939d";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(235, 958); ctx.lineTo(635, 958); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(965, 958); ctx.lineTo(1365, 958); ctx.stroke();
    ctx.fillStyle = "#17222f";
    ctx.font = "700 23px Arial, sans-serif";
    ctx.fillText(INSTRUCTOR, 435, 997);
    ctx.fillText("Student", 1165, 997);
    ctx.fillStyle = "#5d6875";
    ctx.font = "400 17px Arial, sans-serif";
    ctx.fillText("Course Instructor", 435, 1028);
    ctx.fillText("Certificate Holder", 1165, 1028);

    ctx.textAlign = "left";
    ctx.fillStyle = "#68747d";
    ctx.font = "400 16px monospace";
    ctx.fillText(`Certificate ID: ${record.id}`, 75, h - 70);
    ctx.textAlign = "right";
    ctx.fillText("Generated by the CSDC101 Code Baymax activity site", w - 75, h - 70);
  }

  function drawCoverImage(ctx, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const boxRatio = width / height;
    let sx = 0, sy = 0, sw = image.width, sh = image.height;
    if (imageRatio > boxRatio) {
      sw = image.height * boxRatio;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / boxRatio;
      sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function drawProofSheet(record, image) {
    const canvas = elements.proofCanvas;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#f4f7f8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#17222f";
    ctx.fillRect(0, 0, w, 155);
    ctx.fillStyle = "#c9283e";
    ctx.fillRect(0, 155, w, 10);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 36px Arial, sans-serif";
    ctx.fillText("CSDC101 COMPLETION PROOF", 75, 72);
    ctx.fillStyle = "#c5e8eb";
    ctx.font = "500 21px Arial, sans-serif";
    ctx.fillText(GAME_TITLE, 75, 112);

    const detailsX = 75;
    const detailsY = 220;
    const detailsW = 530;
    roundedRect(ctx, detailsX, detailsY, detailsW, 740, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#d7e0e6";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0c7583";
    ctx.font = "800 18px Arial, sans-serif";
    ctx.fillText("STUDENT INFORMATION", detailsX + 35, detailsY + 55);
    ctx.fillStyle = "#17222f";
    ctx.font = "700 25px Arial, sans-serif";
    const nameSize = fitText(ctx, record.name, detailsW - 70, 32, 22);
    ctx.font = `700 ${nameSize}px Arial, sans-serif`;
    ctx.fillText(record.name, detailsX + 35, detailsY + 112);
    ctx.fillStyle = "#5d6875";
    ctx.font = "400 22px Arial, sans-serif";
    ctx.fillText(record.section, detailsX + 35, detailsY + 155);

    ctx.fillStyle = "#0c7583";
    ctx.font = "800 18px Arial, sans-serif";
    ctx.fillText("VERIFIED LOCATION MILESTONES", detailsX + 35, detailsY + 230);
    LOCATIONS.forEach((location, index) => {
      const rowY = detailsY + 290 + index * 70;
      ctx.fillStyle = "#e7f6ee";
      roundedRect(ctx, detailsX + 35, rowY - 34, detailsW - 70, 52, 12);
      ctx.fill();
      ctx.fillStyle = "#18794e";
      ctx.font = "800 21px Arial, sans-serif";
      ctx.fillText(`✓ ${location.name} complete`, detailsX + 55, rowY);
    });

    ctx.fillStyle = "#0c7583";
    ctx.font = "800 18px Arial, sans-serif";
    ctx.fillText("COMPLETION DETAILS", detailsX + 35, detailsY + 605);
    ctx.fillStyle = "#34414c";
    ctx.font = "400 20px Arial, sans-serif";
    ctx.fillText(`Date: ${record.dateLabel}`, detailsX + 35, detailsY + 652);
    ctx.fillText(`Instructor: ${INSTRUCTOR}`, detailsX + 35, detailsY + 690);
    ctx.font = "400 17px monospace";
    ctx.fillText(record.id, detailsX + 35, detailsY + 730);

    const photoX = 650;
    const photoY = 220;
    const photoW = 875;
    const photoH = 740;
    roundedRect(ctx, photoX, photoY, photoW, photoH, 22);
    ctx.save();
    ctx.clip();
    drawCoverImage(ctx, image, photoX, photoY, photoW, photoH);
    ctx.restore();
    ctx.strokeStyle = "#d7e0e6";
    ctx.lineWidth = 3;
    roundedRect(ctx, photoX, photoY, photoW, photoH, 22);
    ctx.stroke();

    ctx.fillStyle = "#5d6875";
    ctx.font = "400 18px Arial, sans-serif";
    ctx.fillText("Student-submitted completion screenshot/photo", photoX, photoY + photoH + 35);
    ctx.fillText("This file was generated locally in the student's browser; no photo was uploaded by this static site.", 75, h - 75);
  }

  function downloadCanvas(canvas, filename) {
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png", 1);
  }

  function safeFilename(value) {
    return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 55) || "student";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    elements.formMessage.textContent = "";

    if (!certificateAccessGranted) {
      elements.formMessage.textContent = "Complete all four game locations or use authorized admin access before generating a certificate.";
      return;
    }

    const name = elements.studentName.value.trim();
    const section = elements.studentSection.value.trim();
    const file = elements.proofPhoto.files[0];
    const photoError = validatePhoto(file);

    if (name.length < 2) return void (elements.formMessage.textContent = "Enter your complete name.");
    if (section.length < 2) return void (elements.formMessage.textContent = "Enter your section.");
    if (photoError) return void (elements.formMessage.textContent = photoError);
    if (!elements.accuracyConsent.checked) return void (elements.formMessage.textContent = "Confirm that your information and proof are accurate.");

    try {
      elements.generateCertificate.disabled = true;
      elements.generateCertificate.textContent = "Preparing files…";
      proofImage = await loadImageFile(file);
      const now = new Date();
      currentRecord = {
        id: createCertificateId(),
        name,
        section,
        completedAt: now.toISOString(),
        dateLabel: new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(now),
        locations: LOCATIONS.map(location => location.name)
      };
      localStorage.setItem(completionRecordKey, JSON.stringify(currentRecord));
      drawCertificate(currentRecord, proofImage);
      drawProofSheet(currentRecord, proofImage);
      elements.certificateId.textContent = currentRecord.id;
      elements.completionActions.hidden = false;
      elements.formMessage.textContent = "";
      elements.completionActions.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      console.error(error);
      elements.formMessage.textContent = error.message || "Unable to generate the completion files.";
    } finally {
      elements.generateCertificate.disabled = !certificateAccessGranted;
      elements.generateCertificate.textContent = "Generate completion files";
    }
  }

  function printCertificate() {
    if (!currentRecord) return;
    let printView = document.querySelector("#printCertificateView");
    if (!printView) {
      printView = document.createElement("div");
      printView.id = "printCertificateView";
      printView.hidden = true;
      const image = document.createElement("img");
      image.alt = "Certificate of completion";
      printView.appendChild(image);
      document.body.appendChild(printView);
    }
    printView.querySelector("img").src = elements.certificateCanvas.toDataURL("image/png");
    printView.hidden = false;
    window.print();
    setTimeout(() => { printView.hidden = true; }, 500);
  }

  function resetProgress() {
    const confirmed = window.confirm("Reset all Code Baymax level progress and the saved certificate record on this browser? This cannot be undone.");
    if (!confirmed) return;
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith("flambe:level") || key === "flambe:armor-complete" || key === completionRecordKey)) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
    currentRecord = null;
    proofImage = null;
    elements.completionActions.hidden = true;
    elements.certificateForm.reset();
    elements.fileName.textContent = "No image selected";
    refreshProgress();
    restartGame();
  }

  elements.gameFrame.addEventListener("load", () => {
    setTimeout(() => elements.gameLoader.classList.add("is-hidden"), 650);
    refreshProgress();
  });
  elements.restartGame.addEventListener("click", restartGame);
  elements.fullscreenGame.addEventListener("click", enterFullscreen);
  elements.proofPhoto.addEventListener("change", () => {
    const file = elements.proofPhoto.files[0];
    elements.fileName.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "No image selected";
    elements.formMessage.textContent = file ? validatePhoto(file) : "";
  });
  elements.certificateForm.addEventListener("submit", handleSubmit);
  elements.downloadCertificate.addEventListener("click", () => {
    if (currentRecord) downloadCanvas(elements.certificateCanvas, `${safeFilename(currentRecord.name)}-Code-Baymax-Certificate.png`);
  });
  elements.downloadProof.addEventListener("click", () => {
    if (currentRecord) downloadCanvas(elements.proofCanvas, `${safeFilename(currentRecord.name)}-Code-Baymax-Proof.png`);
  });
  elements.printCertificate.addEventListener("click", printCertificate);
  elements.resetProgress.addEventListener("click", resetProgress);
  elements.adminAccess.addEventListener("click", () => {
    if (adminMode) scrollToCertificate();
    else openAdminDialog();
  });
  elements.adminForm.addEventListener("submit", handleAdminSubmit);
  elements.adminClose.addEventListener("click", closeAdminDialog);
  elements.adminCancel.addEventListener("click", closeAdminDialog);
  elements.adminCode.addEventListener("input", () => {
    elements.adminCode.value = elements.adminCode.value.replace(/\D/g, "").slice(0, 6);
    elements.adminMessage.textContent = "";
  });
  elements.adminDialog.addEventListener("click", event => {
    if (event.target === elements.adminDialog) closeAdminDialog();
  });
  elements.exitAdminMode.addEventListener("click", () => {
    setAdminMode(false);
    elements.formMessage.textContent = "Admin mode ended. Complete all four locations to unlock the certificate again.";
  });
  window.addEventListener("storage", refreshProgress);
  window.addEventListener("message", event => {
    if (event.data?.type === "code-baymax-progress") refreshProgress();
  });

  refreshProgress();
  setInterval(refreshProgress, 1500);
})();
