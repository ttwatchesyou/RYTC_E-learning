export const risingEdge = (current: boolean, previous: boolean): boolean => current && !previous;
export const fallingEdge = (current: boolean, previous: boolean): boolean => !current && previous;
