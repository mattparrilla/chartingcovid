import { json } from 'd3';
import { urlifyName } from './utilities';

class DataManager {
  constructor(fips, cases, countyOutline, generateNewCases) {
    this.fips = fips;
    this.cases = cases;
    this.countyOutline = countyOutline;
    // map of {fips: [newCases, newCases + 1]
    this.newCases = generateNewCases(cases);
  }

  async getFipsCountyName(fips) {
    const fipsData = await this.fips;
    return fipsData[fips].county;
  }

  async getFipsStateName(fips) {
    const fipsData = await this.fips;
    return fipsData[fips].state;
  }

  async getNameByFips(fips) {
    const fipsData = await this.fips;
    return fipsData[fips].county || fipsData[fips].state;
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
      urlifyName(fips[item].state) === urlStateName &&
        // County in FIPS json is ex: Bergen County
        urlifyName(fips[item].county) === urlCountyName
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

  // return list of fips that represent all states
  async getAllCounties() {
    const fipsData = await this.fips;
    return Object.keys(fipsData)
      .filter(fips => fipsData[fips].county !== "")
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

  async getDates() {
    const caseData = await this.cases;
    return Object.keys(caseData)
      .sort((firstEl, secondEl) => new Date(secondEl) - new Date(firstEl));
  }

  async getFipsEntry(fips) {
    const fipsData = await this.fips;
    return fipsData[fips];
  }


  async getDaysPriorData(daysPrior) {
    const sortedDates = await this.getDates();
    const caseData = await this.cases;
    return caseData[sortedDates[daysPrior]];
  }

  async getMostRecentData() {
    return this.getDaysPriorData(0);
  }

  async getCountyOutline() {
    return this.countyOutline;
  }

  async getCasesGivenFips(fips) {
    const cases = await this.cases;
    const dates = await this.getDates();
    return dates.map(date => cases[date][fips]);
  }

  async getCasesGivenDateFips(date, fips) {
    const cases = await this.cases;
    return (cases[date] && cases[date][fips] && cases[date][fips].cases) || null;
  }

  async getPopulation(fips) {
    const fipsData = await this.fips;
    return fipsData[fips].population;
  }

  async getNewCasesGivenState(stateFips) {
    const fipsData = await this.fips;
    const newCasesData = await this.newCases;
    const state = await this.getFipsStateName(stateFips);
    const cases = {};
    Object.entries(fipsData).forEach(([fips, fipsInfo]) => {
      if (fipsInfo.county && fipsInfo.state === state && newCasesData[fips]) {
        cases[fips] = newCasesData[fips];
      }
    });
    return cases;
  }

  async getNewCasesAllStates() {
    const fipsData = await this.fips;
    const newCasesData = await this.newCases;
    const stateCases = {};
    Object.entries(fipsData).forEach(([fips, fipsInfo]) => {
      if (fipsInfo.county === "") {
        stateCases[fips] = newCasesData[fips];
      }
    });
    return stateCases;
  }
}

async function calculateNewCasesFromData(casesData) {
  const newCases = {};
  const casesByDate = await casesData;
  const caseThreshold = 50;
  const prevCases = {};

  // Assumes data is ordered
  Object.values(casesByDate).forEach((casesByFips) => {
    Object.entries(casesByFips).forEach(([fips, values]) => {
      const { cases } = values;
      if (cases >= caseThreshold && fips in prevCases) {
        const delta = cases - prevCases[fips];
        prevCases[fips] = cases;
        if (fips in newCases) {
          newCases[fips].push(delta);
        } else {
          newCases[fips] = [delta];
        }
      } else {
        // store value < 50 so that we can calculate our new cases once we
        // cross the threshold.
        prevCases[fips] = cases;
      }
    });
  });
  return Promise.resolve(newCases);
}

export default async function initDataManager() {
  window.dataManager = new DataManager(
    json("/data/fips_data.json"),
    json("/data/covid_cases_by_date.json"),
    json("/data/counties-albers-10m2.json"),
    calculateNewCasesFromData
  );
}
