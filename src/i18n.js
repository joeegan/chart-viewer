/**
 * errorCode {String} error code
 **/
function i18n(errorCode, extras) {
	var key = errorCode.replace(/\./g,'');
	var msg = errorCode;
	var dictionary = {
		"errorsprintmarketcreate-positionmarket-closed": "Error: Market closed",
		"errorsprintmarketcreate-positionorder-sizeinvalid": "Error: Order size invalid",
		"errorpublic-apiexceeded-account-historical-data-allowance": "API Error: Historical Data Allowance exceeded",
        "errorsprintmarketcreate-positionexpiryoutside-valid-range": "API Error: Sprint Market create position outside valid range"
	}
	if (dictionary[key]) {
		msg = dictionary[key];
	}
	if (extras) {
		msg += (' ' + extras);
	}
	return msg;
}

