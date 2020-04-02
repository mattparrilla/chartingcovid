import { urlifyName } from './utilities';
import router from './router';

class LocationManager {
  constructor({ county, state }) {
    this.countyFips = county;
    this.stateFips = state;
  }

  async setCounty(fips) {
    this.countyFips = fips;

    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    const county = urlifyName(await window.dataManager.getFipsCountyName(fips));
    router.navigateTo(`/state/${state}/county/${county}`);
  }

  async setState(fips) {
    this.stateFips = fips;

    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    router.navigateTo(`/state/${state}`);
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

  getIsCountryView() {
    return !(this.getStateFips() || this.getCountyFips());
  }
}

export default function initLocationManager({ county = "", state = "" } = {}) {
  // if this is our first time calling init, initialize, else use existing object
  window.locationManager = window.locationManager || new LocationManager({ county, state });
}
