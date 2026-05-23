// Allow importing SCSS files (both modules and side-effect imports)
declare module "*.scss" {
  const styles: Record<string, string>;
  export default styles;
}
