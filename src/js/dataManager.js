import { json } from 'd3';
import { urlifyName } from './utilities';

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

  async getFipsForStateUrl(urlStateName) {
    const fips = await this.fips;
    return Object.keys(fips).find(item => (
      urlifyName(fips[item].state) === urlStateName
    ));
  }

  async getFipsForCountyUrl(urlCountyName, urlStateName) {
    const fips = await this.fips;
    return Object.keys(fips).find(item => (
      // State in FIPS json is ex: New Jersey
      urlifyName(fips[item].state) === urlStateName
      // County in FIPS json is ex: Bergen County
        && urlifyName(fips[item].county) === urlCountyName
    ));
  }

  // return list of fips that represent all states
  async getAllStates() {
    const fipsData = await this.fips;
    return Object.keys(fipsData)
      .filter(fips => fipsData[fips].county === "")
      .map(fips => ({
        ...fipsData[fips],
        fips
      }));
  }

  // return list of counties given a state fips
  async getCountiesGivenState(stateFips) {
    const fipsData = await this.fips;
    return Object.keys(fipsData)
      .filter(fips => (
        fipsData[fips].county && fipsData[fips].state === fipsData[stateFips].state))
      .map(fips => ({
        ...fipsData[fips],
        fips
      }));
  }

  async getFipsEntry(fips) {
    const fipsData = await this.fips;
    return fipsData[fips];
  }

  async getMostRecentData() {
    const caseData = await this.cases;
    const sortedDates = Object.keys(caseData)
    .sort((firstEl, secondEl) => new Date(secondEl) - new Date(firstEl));
    return caseData[sortedDates[0]];
  }

  async getCountyOutline() {
    return this.countyOutline;
  }
}

export default async function initDataManager() {
  window.dataManager = new DataManager(
    json("/data/fips_data.json"),
    json("/data/covid_cases_by_date.json"),
    json("/data/counties-albers-10m2.json")
  );
}
