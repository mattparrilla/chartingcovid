class LocationManager {
  constructor() {
    this.countyFips = "";
    this.stateFips = "";
    this.lastState = "";
  }

  updateFips(state, county) {
    this.lastState = this.stateFips;
    this.stateFips = state;
    this.countyFips = county;
  }

  updateStateFips(state) {
    this.lastState = this.stateFips;
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

  getFips() {
    return this.countyFips || this.stateFips;
  }
}

export default function initLocationManager() {
  window.locationManager = new LocationManager();
}
