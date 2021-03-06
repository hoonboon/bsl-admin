import { EMPLOYEESIZE_5, EMPLOYEESIZE_20, EMPLOYEESIZE_50, EMPLOYEESIZE_999 } from "../models/Employer";

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

// Row Per Page
export function OPTIONS_ROW_PER_PAGE() {
    return [
        { label: "10", value: "10" },
        { label: "25", value: "25" },
        { label: "50", value: "50" },
        { label: "100", value: "100" }
    ] as SelectOption[];
}

// Page No.
export function OPTIONS_PAGE_NO(totalPageNo: number) {
    const result = [] as SelectOption[];
    if (totalPageNo && totalPageNo > 0) {
        for (let i = 0; i < totalPageNo; i++) {
            const option = {
                label: (i + 1).toString(),
                value: (i + 1).toString()
            };
            result.push(option);
        }
    }
    return result;
}

// Nationality
export function OPTIONS_NATIONALITY() {
    return [
        { label: "Malaysia", value: "MY" },
        { label: "Singapore", value: "SG" },
        { label: "Thailand", value: "TH" },
        { label: "Brunei", value: "BR" },
        { label: "Other", value: "OT" }
    ] as SelectOption[];
}

// Race
export function OPTIONS_RACE() {
    return [
        { label: "Malay", value: "M" },
        { label: "Chinese", value: "C" },
        { label: "Indian", value: "I" },
        { label: "Siamese", value: "S" },
        { label: "Other", value: "O" }
    ] as SelectOption[];
}

// Gender
export function OPTIONS_GENDER() {
    return [
        { label: "Male", value: "M" },
        { label: "Female", value: "F" },
        { label: "Other", value: "O" }
    ] as SelectOption[];
}

// Employee Sizes
export function OPTIONS_EMPLOYEE_SIZE() {
    return [
        { label: "5 or less", value: EMPLOYEESIZE_5 },
        { label: "Between 6 and 20", value: EMPLOYEESIZE_20 },
        { label: "Between 21 and 50", value: EMPLOYEESIZE_50 },
        { label: "51 or more", value: EMPLOYEESIZE_999 },
    ] as SelectOption[];
}

export function markSelectedOption(selectedValue: string, options: SelectOption[]) {
    if (selectedValue && options) {
        const option = options.find(option => option.value === selectedValue);
        if (option) {
            option.isSelected = true;
        }
    }
}

export function markSelectedOptions(selectedValues: string[], options: SelectOption[]) {
    if (selectedValues && options) {
        options.forEach(option => {
            if (selectedValues.indexOf(option.value) > -1) {
                option.isSelected = true;
            }
        });
    }
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