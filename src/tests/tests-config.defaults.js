/**
 * Safe defaults when ./.tests-config.js is absent (e.g. fresh clone, CI without TESTS_CONFIG).
 * Real institution tests stay skipped because companyAPI.enabled is false.
 * For live scraping tests, copy .tests-config.tpl.js to .tests-config.js (see CONTRIBUTING.md).
 */
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 1);

module.exports = {
  options: {
    startDate,
    combineInstallments: false,
    showBrowser: false,
    verbose: false,
    args: [],
  },
  credentials: {},
  companyAPI: {
    enabled: false,
    excelFilesDist: '',
    invalidPassword: false,
  },
};
