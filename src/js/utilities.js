// Replace spaces with '-' and convert to lowercase
export function urlifyName(name) {
  return name.replace(" County", "").replace(/\s/g, '-').toLowerCase();
}

export function filterOutCounties(data) {
  return Object.keys(data).filter(fips => data[fips].county === "");
}

// Sort dates in ascending order
export function sortDateString(dates) {
  return Object.keys(dates).sort((firstEl, secondEl) => new Date(firstEl) - new Date(secondEl));
}
