export interface SelectOption {
    label: string;
    value: string;
    isDefault?: boolean;
    isSelected?: boolean;
}

// Employment types
export function OPTIONS_EMPTYPE() {
    return [
        { label: "Tetap", value: "PERMANENT" },
        { label: "Sambilan", value: "PARTTIME" },
        { label: "Kontrak", value: "CONTRACT" },
        { label: "Sementara", value: "TEMPORARY" }
    ] as SelectOption[];
}

// Languages
export function OPTIONS_LANGUAGE() {
    return [
        { label: "Melayu", value: "ms" },
        { label: "Inggeris", value: "en" },
        { label: "Cina", value: "zh" },
        { label: "Thai", value: "th" },
        { label: "Hindi", value: "hi" },
        { label: "Tamil", value: "ta" }
    ] as SelectOption[];
}

// Locations
// Refer to http://www.anm.gov.my/images/Perkhidmatan/Perakaunan/2011/lamp-b-senarai-kod-negeri-daerah.pdf
export function OPTIONS_LOCATION() {
    return [
        { label: "Bachok", value: "03-01" },
        { label: "Kota Bharu", value: "03-02" },
        { label: "Machang", value: "03-03" },
        { label: "Pasir Mas", value: "03-04" },
        { label: "Pasir Puteh", value: "03-05" },
        { label: "Tanah Merah", value: "03-06" },
        { label: "Tumpat", value: "03-07" },
        { label: "Gua Musang", value: "03-08" },
        { label: "Kuala Krai", value: "03-09" },
        { label: "Jeli", value: "03-10" },
        { label: "Lain-lain", value: "99-99" }
    ] as SelectOption[];
}

export function getLabelByValue(value: string, options: SelectOption[]) {
    let result: string;
    if (options) {
        const option = options.find(option => option.value === value);
        if (option) {
            result = option.label;
        }
    }
    return result;
}

export function getLabelsByValues(values: string[], options: SelectOption[]) {
    const result: string[] = [];
    if (options) {
        values.forEach((value) => {
            const label = getLabelByValue(value, options);
            if (label) {
                result.push(label);
            }
        });
    }
    return result;
}

export function getFlattenedLabelsByValues(values: string[], options: SelectOption[]) {
    let result = "";
    if (values) {
        const labels = this.getLabelsByValues(values, options) as string[];
        if (labels) {
            labels.forEach((label, i) => {
                if (i == 0)
                    result = label;
                else
                    result += ", " + label;
            });
        }
    }
    return result;
}