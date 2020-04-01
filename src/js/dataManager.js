import { json } from 'd3';

class DataManager {
  constructor(fips, cases, countyOutline) {
    this.fips = fips;
    this.cases = cases;
    this.countyOutline = countyOutline;
  }

  async getFipsCountyName(fips) {
    const fipsData = await this.fips;
    return fipsData[fips].county;
  }

  async getFipsStateName(fips) {
    const fipsData = await this.fips;
    return fipsData[fips].state;
  }
}

export default async function initDataManager() {
  window.dataManager = new DataManager(
    json("/data/fips_data.json"),
    json("/data/covid_cases_by_date.json"),
    json("/data/counties-albers-10m2.json")
  );
}
