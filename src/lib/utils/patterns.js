export const PATTERNS = {
	email: "^[A-Z0-9._\\%\\+\\-]+@[A-Z0-9.\\-]+.[A-Z]{2,}$/i",
	phone: "[0-9\\+\\(\\). \\-]{6,32}", // dash and dot escaped
	zip: "[\\-A-Za-z0-9 ]{2,16}", // dash escaped
	companyReg: "[\\-\\.\\/A-Za-z0-9 ]{3,32}", // dash and dot escaped
	url: "https?://.*", // OK for HTML
	// name: "[\\-A-Za-z0-9 ,.\\&\\/\\(\\)\\\\'_]{1,127}",
	name: "[A-Za-z0-9 ,.&\\/\\(\\)'_\\-]{1,127}",
	// name: "[\\-A-Za-z0-9 ,\\.\\&/\\(\\)\\'_]{1,128}",
	iso2: "[A-Z]{2}",
	iso3: "[A-Z]{3}",
};
