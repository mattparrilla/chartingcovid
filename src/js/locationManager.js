import { urlifyName } from './utilities';
import router from './router';

class LocationManager {
  constructor() {
    this.countyFips = "";
    this.stateFips = "";
  }

  async setCounty(fips) {
    this.countyFips = fips;

    const state = urlifyName(await window.dataManager.getFipsStateName(fips));
    const county = urlifyName(await window.dataManager.getFipsCountyName(fips));
    router.navigateTo(`/state/${state}/county/${county}`);
  }

  async setState(fips) {
    this.stateFips = fips;

    // Update URL
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
}

export default async function initLocationManager() {
  window.locationManager = new LocationManager();
}
