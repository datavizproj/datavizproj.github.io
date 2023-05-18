export interface ROAD {
  name: string,
  startLat: number,
  startLong: number,
  endLat: number,
  endLong: number,
}

export interface TRAFFIC_DENSITY_FORM {
  road: ROAD
  startDate: Date
  endDate: Date
}