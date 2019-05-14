
/**
 * Round number to the closest 0.05
 */
export function getRoundedAmount(amountBeforeRounding: number) {
    let result = amountBeforeRounding;

    result = Math.floor(result * 100) / 100;

    result = (Math.round((result * 100) / (5e-2 * 100)) * (5e-2 * 100)) / 100;

    result = Math.floor(result * 100) / 100;

    return result;
}