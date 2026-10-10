declare module "@svg-maps/brazil" {
  const map: {
    label: string;
    viewBox: string;
    locations: { name: string; id: string; path: string }[];
  };
  export default map;
}
