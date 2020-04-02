import { urlifyName } from './utilities';
import router from './router';

class LocationManager {
  constructor() {
    this.countyFips = "";
    this.stateFips = "";
  }

  // Update the county for the page and update URL
  async setAndGoToCounty(fips) {
    this.countyFips = fips;

    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    const county = urlifyName(await window.dataManager.getFipsCountyName(fips));
    router.navigateTo(`/state/${state}/county/${county}`);
  }

  // Update the state for the page and update URL
  async setAndGoToState(fips) {
    this.stateFips = fips;

    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    router.navigateTo(`/state/${state}`);
  }

  updateFips(state, county) {
    this.stateFips = state;
    this.countyFips = county;
  }

  updateStateFips(state) {
    this.stateFips = state;
  }

  getCountyFips() {
    return this.countyFips;
  }

  getStateFips() {
    return this.stateFips;
  }

  getCountyName(fipsData) {
    return fipsData[this.countyFips].county;
  }

  getStateName(fipsData) {
    return fipsData[this.stateFips].state;
  }

  isCountryView() {
    return !(this.getStateFips() || this.getCountyFips());
  }
}

export default function initLocationManager() {
  window.locationManager = new LocationManager();
}
