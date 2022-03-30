const fs = require("fs");

function fileReader(path) {
	try {
		return fs.readFileSync(path, "utf-8");
	} catch (error) {
		console.log(error);
	}
}

function fileWritter(path, data) {
	try {
		fs.writeFileSync(path, data);
	} catch (err) {
		console.error(err);
	}
}

let fixQuotesAndCommas = (text) =>
	text.replace(/,(?!(?:[^"]*"[^"]*")*[^"]*$)/, "/").replace(/"/g, "");

let simpleParser = (header, value) => ({ [header]: value });

let booleanParser = (header, value) =>
	value == "yes" || value == 1 ? { [header]: "true" } : { [header]: "false" };

let groupParser = (header, value, obj) => {
	if (obj.hasOwnProperty("groups")) {
		value
			.split("/")
			.map((g) => g.trim())
			.forEach((g) => {
				g != "" && obj["groups"].indexOf(g) < 0
					? obj["groups"].push(g)
					: null;
			});
		return { groups: obj["groups"] };
	}
	return { groups: value.split("/").map((g) => g.trim()) };
};

let addressParser = (type, tags, values) => {
	arr = [];
	values.split("/").forEach((value) => {
		value = EmailAndPhoneValidator(type, value);
		if (!value) return;
		arr.push({
			type: type,
			tags: tags,
			address: value,
		});
	});
	return arr;
};

let addressesParser = (header, value, obj) => {
	let tags = header.split(" ");
	let type = tags.shift();

	if (value !== null && value !== "") {
		if (obj.hasOwnProperty("addresses")) {
			addressParser(type, tags, value).forEach((address) =>
				obj["addresses"].push(address)
			);
			return { addresses: obj["addresses"] };
		}
		return {
			addresses: addressParser(type, tags, value),
		};
	}
};

let EmailAndPhoneValidator = (type, value) => {
	if (type === "phone") {
		value = value.replace(/[^0-9]/g, "");
		if (
			value > 0 &&
			value !== "" &&
			!(value.length < 10) &&
			!(value.length > 11)
		) {
			return "55" + value;
		}
	}
	if (type === "email") {
		value = value.match(
			/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
		);
		if (value !== null) {
			return value;
		}
	}
	return false;
};

let itemParsers = {
	fullname: { parser: simpleParser },
	eid: { parser: simpleParser },
	invisible: { parser: booleanParser },
	see_all: { parser: booleanParser },
	group: { parser: groupParser },
	phone: { parser: addressesParser },
	email: { parser: addressesParser },
};

function buildItem(headers, values, hasItem) {
	let item = hasItem ? hasItem : {};

	headers.forEach((header, index) => {
		let type = header.split(" ").shift();
		if (itemParsers.hasOwnProperty(type)) {
			let parser = itemParsers[type].parser;
			Object.assign(item, parser(header, values[index], item));
		}
	});
	return item;
}

function csvParser(csv) {
	let itemArray = [];
	let csvRows = csv.split(/\r?\n/);
	const csvHeaders = fixQuotesAndCommas(csvRows.shift()).split(",");
	const ied = csvHeaders.indexOf("eid");

	csvRows.forEach((line) => {
		line = fixQuotesAndCommas(line).split(",");
		let item = itemArray.find((item) => item.eid === line[ied]);
		if (item) {
			buildItem(csvHeaders, line, item);
		} else {
			itemArray.push(buildItem(csvHeaders, line));
		}
	});
	return itemArray;
}

let csv = fileReader("input.csv");
let json = JSON.stringify(csvParser(csv));
fileWritter("output.json", json);
