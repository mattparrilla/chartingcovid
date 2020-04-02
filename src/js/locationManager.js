class LocationManager {
  constructor() {
    this.countyFips = "";
    this.stateFips = "";
  }

  updateFips(state, county) {
    this.stateFips = state;
    this.countyFips = county;
  }

  updateStateFips(state) {
    this.stateFips = state;
    this.countyFips = null;
  }

  getCountyFips() {
    return this.countyFips;
  }

  getStateFips() {
    return this.stateFips;
  }

  isCountryView() {
    return !(this.getStateFips() || this.getCountyFips());
  }
}

export default function initLocationManager() {
  window.locationManager = new LocationManager();
}
