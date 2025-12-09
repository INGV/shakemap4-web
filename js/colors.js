// Intensity color mapping for ShakeMap (MMI scale 0-10)
const intColors_USGS = [
    'black',   // 0 - Not felt/Invalid (matches map fallback)
    '#FFFFFF', // 1 - Not felt
    '#BFCCFF', // 2 - Weak
    '#A0E6FF', // 3 - Weak
    '#80FFFF', // 4 - Light
    '#7AFF93', // 5 - Moderate
    '#FFFF00', // 6 - Strong
    '#FFC800', // 7 - Very strong
    '#FF9100', // 8 - Severe
    '#FF0000', // 9 - Violent
    '#C80000'  // 10 - Extreme
];

// The colors of the intensity contours are defined here in the following way:
// intensityValue: 'color'
var intColors = {
    1: '#FFFFFF',
    1.5: '#FFFFFF',
    2: '#ACD8E9',
    2.5: '#ACD8E9',
    3: '#ACD8E9',
    3.5: '#ACD8E9',
    4: '#83D0DA',
    4.5: '#83D0DA',
    5: '#7BC87F',
    5.5: '#7BC87F',
    6: '#F9F518',
    6.5: '#F9F518',
    7: '#FAC611',
    7.5: '#FAC611',
    8: '#FA8A11',
    8.5: '#FA8A11',
    9: '#F7100C',
    9.5: '#F7100C',
    10: '#C80F0A'
};
