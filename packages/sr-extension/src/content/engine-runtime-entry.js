import {
  createDomScanner,
  generateAnnouncement,
  getContextEndAnnouncement,
} from "@sr-output/engine";

window.__srEngineGenerateAnnouncement = generateAnnouncement;
window.__srEngineGetContextEndAnnouncement = getContextEndAnnouncement;
window.__srEngineCreateDomScanner = createDomScanner;