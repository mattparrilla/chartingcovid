import { json } from 'd3';

export function fetchData(filenames) {
  return Promise.all(filesnames.map(filename => json(filename)));
}

export function filterOutCounties(data) {
  return Object.keys(data)
    .reduce((stateData, fips) => {
      if (data[fips].county === "") {
        return [
          ...stateData,
          {
            fips,
            ...data[fips]
          }
        ];
      }
      return stateData;
    }, []);
}

export function sortDateString(dates) {
  return Object.keys(dates).sort((firstEl, secondEl) => new Date(secondEl) - new Date(firstEl));
}
