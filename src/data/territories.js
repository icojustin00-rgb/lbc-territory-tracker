export const territories = [
  {
    day: "Tuesday",
    territoryNo: "2A & 2B",
    streets: [
      "R. Pascual (Left Side)",
      "San Mauricio",
      "J. Wright",
      "San Luis",
      "San Jose",
      "A. Rita",
      "San Pablo",
      "F. Manalo",
    ],
  },
  {
    day: "Wednesday",
    territoryNo: "3 & 4A",
    streets: [
      "R. Fernandez",
      "A. Rita",
      "San Miguel",
      "A. Villa",
      "Col. Ver",
      "Blumentrit",
      "Angeles",
      "Soriano",
      "Bonifacio",
    ],
  },
  {
    day: "Thursday",
    territoryNo: "1, 14-17",
    streets: [
      "Abad Santos (Left Side Only)",
      "Mascardo",
      "A. Lim",
      "M.A. Reyes up to Jacinto",
      "Abad Santos to Ortigas Ave (Right Side/Wilson)",
      "F. Manalo (Bautista to Kalentong)",
      "San Juan Ville",
      "AMA (Container House)",
    ],
  },
  {
    day: "Friday",
    territoryNo: "9",
    streets: [
      "F. Manalo (Stop Light)",
      "Urbino",
      "Angeles",
      "M. Marcos",
      "Del Pilar",
      "Aurora",
      "V. Cruz",
      "Gruet",
      "Wilson",
    ],
  },
];

export const totalStreetCount = territories.reduce(
  (total, item) => total + item.streets.length,
  0
);