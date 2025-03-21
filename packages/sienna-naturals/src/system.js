// system.js
const DEFAULT_IMAGES = {
    primary: "https://www.siennanaturals.com/cdn/shop/files/banner1.jpg",
    secondary: [
        "https://www.siennanaturals.com/cdn/shop/files/hannah_issa_duo_ed709ef3-f5f4-424d-9372-e24c03be8f7c_370x230@2x.png",
        "https://www.siennanaturals.com/cdn/shop/files/navigation_customertestimonials_370x230@2x.jpg",
        "https://www.siennanaturals.com/cdn/shop/files/Mobile_48_370x230@2x.png"
    ]
};
const stores =                 [
    {
      "store_name": "THIRTEEN LUNE at JCP inside GATEWAY MALL",
      "address": "68 GATEWAY MALL, LINCOLN, Nebraska 68505",
      "city": "LINCOLN",
      "state": "Nebraska",
      "zip_code": "68505",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - LEGENDS KANSAS CITY",
      "address": "1847 Village West Pkwy, Suite K-117, Kansas City, KS",
      "city": "Kansas City",
      "state": "KS",
      "zip_code": "66111",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHADOW LAKE TOWN CTR",
      "address": "7751 TOWNE CENTER PKWY, PAPILLION, Nebraska 68046",
      "city": "PAPILLION",
      "state": "Nebraska",
      "zip_code": "68046",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside OAK PARK SHOPG CNTR",
      "address": "11801 W 95TH ST, OVERLAND PARK, Kansas 66214",
      "city": "OVERLAND PARK",
      "state": "Kansas",
      "zip_code": "66214",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Oak Park Mall",
      "address": "11143 W 95th Street, Overland Park, Kansas 66214",
      "city": "Overland Park",
      "state": "Kansas",
      "zip_code": "66214",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - COUNTRY CLUB PLAZA",
      "address": "424 Nichols Road, Kansas City, MO",
      "city": "Kansas City",
      "state": "MO",
      "zip_code": "64112",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PLAZA @ SHOAL CREEK",
      "address": "8100 N FLINTLOCK RD, KANSAS CITY, Missouri 64158",
      "city": "KANSAS CITY",
      "state": "Missouri",
      "zip_code": "64158",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE MARKETPLACE",
      "address": "3333 MARKET PLACE DR, COUNCIL BLUFFS, Iowa 51501",
      "city": "COUNCIL BLUFFS",
      "state": "Iowa",
      "zip_code": "51501",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TOWNE EAST SQUARE",
      "address": "7700 E KELLOGG DR, WICHITA, Kansas 67207",
      "city": "WICHITA",
      "state": "Kansas",
      "zip_code": "67207",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHERN HILLS MALL",
      "address": "4340 SERGEANT RD, SIOUX CITY, Iowa 51106",
      "city": "SIOUX CITY",
      "state": "Iowa",
      "zip_code": "51106",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY WEST MALL",
      "address": "1551 VALLEY WEST DR, WEST DES MOINES, Iowa 50266",
      "city": "WEST DES MOINES",
      "state": "Iowa",
      "zip_code": "50266",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHPARK MALL",
      "address": "101 RANGE LINE STE 250A, JOPLIN, Missouri 64801",
      "city": "JOPLIN",
      "state": "Missouri",
      "zip_code": "64801",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTH GRAND MALL",
      "address": "2901 N GRAND AVE, AMES, Iowa 50010",
      "city": "AMES",
      "state": "Iowa",
      "zip_code": "50010",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside COLUMBIA MALL",
      "address": "2301 W WORLEY, COLUMBIA, Missouri 65203",
      "city": "COLUMBIA",
      "state": "Missouri",
      "zip_code": "65203",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE CENTER @ OWASSO",
      "address": "9056 N 121ST EAST AVE, OWASSO, Oklahoma 74055",
      "city": "OWASSO",
      "state": "Oklahoma",
      "zip_code": "74055",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WOODLAND HILLS",
      "address": "7021 S. Memorial Drive, Suite# 215, Tulsa, OK",
      "city": "Tulsa",
      "state": "OK",
      "zip_code": "74133",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE EMPIRE MALL",
      "address": "3200 W EMPIRE MALL, SIOUX FALLS, South Dakota 57106",
      "city": "SIOUX FALLS",
      "state": "South Dakota",
      "zip_code": "57106",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NW ARKANSAS MALL",
      "address": "4201 N SHILOH DR, FAYETTEVILLE, Arkansas 72703",
      "city": "FAYETTEVILLE",
      "state": "Arkansas",
      "zip_code": "72703",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - IOWA CITY",
      "address": "1451 Coral Ridge Ave, Space #320, Coralville, IA",
      "city": "Coralville",
      "state": "IA",
      "zip_code": "52241",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside QUAIL SPRINGS MALL",
      "address": "2501 W MEMORIAL RD, OKLAHOMA CITY, Oklahoma 73134",
      "city": "OKLAHOMA CITY",
      "state": "Oklahoma",
      "zip_code": "73134",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPS @ MOORE",
      "address": "2400 S SERVICE RD, MOORE, Oklahoma 73160",
      "city": "MOORE",
      "state": "Oklahoma",
      "zip_code": "73160",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CENTRAL MALL",
      "address": "5111 ROGERS AVE, FORT SMITH, Arkansas 72903",
      "city": "FORT SMITH",
      "state": "Arkansas",
      "zip_code": "72903",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHPARK SHOPG CNTR",
      "address": "320 W KIMBERLY RD STE 409, DAVENPORT, Iowa 52806",
      "city": "DAVENPORT",
      "state": "Iowa",
      "zip_code": "52806",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ST LOUIS GALLERIA",
      "address": "2407 St Louis Galleria, Space 2407, St Louis, MO",
      "city": "St Louis",
      "state": "MO",
      "zip_code": "63117",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ST CLAIR SQ",
      "address": "245 SAINT CLAIR SQ, FAIRVIEW HEIGHTS, Illinois 62208",
      "city": "FAIRVIEW HEIGHTS",
      "state": "Illinois",
      "zip_code": "62208",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - APACHE MALL",
      "address": "333 Apache Mall Suite 669, Rochester, MN",
      "city": "Rochester",
      "state": "MN",
      "zip_code": "55902",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SPRINGFIELD",
      "address": "1201 S DIRKSEN PKWY, SPRINGFIELD, Illinois 62703",
      "city": "SPRINGFIELD",
      "state": "Illinois",
      "zip_code": "62703",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHWOODS SHOPG CTR",
      "address": "2200 W WAR MEMORIAL DR STE 997, PEORIA, Illinois 61613",
      "city": "PEORIA",
      "state": "Illinois",
      "zip_code": "61613",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside EDEN PRAIRIE CTR",
      "address": "8201 FLYING CLOUD DR, EDEN PRAIRIE, Minnesota 55344",
      "city": "EDEN PRAIRIE",
      "state": "Minnesota",
      "zip_code": "55344",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY VIEW MALL (LA Crosse)",
      "address": "3700 STATE RD 16, LA CROSSE, Wisconsin 54601",
      "city": "LA CROSSE",
      "state": "Wisconsin",
      "zip_code": "54601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WEST PARK MALL",
      "address": "200 W PARK MALL, CAPE GIRARDEAU, Missouri 63703",
      "city": "CAPE GIRARDEAU",
      "state": "Missouri",
      "zip_code": "63703",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHACKLEFORD CROSSING",
      "address": "2600 S SHACKLEFORD RD, LITTLE ROCK, Arkansas 72205",
      "city": "LITTLE ROCK",
      "state": "Arkansas",
      "zip_code": "72205",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MC CAIN SHOPG CNTR",
      "address": "3929 MCCAIN BLVD STE 500, NORTH LITTLE ROCK, Arkansas 72116",
      "city": "NORTH LITTLE ROCK",
      "state": "Arkansas",
      "zip_code": "72116",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL @ TURTLE CREEK",
      "address": "3000 E HIGHLAND DR STE 516, JONESBORO, Arkansas 72401",
      "city": "JONESBORO",
      "state": "Arkansas",
      "zip_code": "72401",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHERMAN TOWN CTR",
      "address": "610 GRAHAM DR, SHERMAN, Texas 75092",
      "city": "SHERMAN",
      "state": "Texas",
      "zip_code": "75092",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - HILLDALE",
      "address": "422 N Midvale Blvd, Madison, WI",
      "city": "Madison",
      "state": "WI",
      "zip_code": "53705",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WESTGATE MALL (Amarillo)",
      "address": "7701 W I-40 STE 600, AMARILLO, Texas 79121",
      "city": "AMARILLO",
      "state": "Texas",
      "zip_code": "79121",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PRAIRIE CTR",
      "address": "1950 PRAIRIE CENTER PKWY, BRIGHTON, Colorado 80601",
      "city": "BRIGHTON",
      "state": "Colorado",
      "zip_code": "80601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside OGDEN HILL OF MONTG",
      "address": "1100 OGDEN AVE, MONTGOMERY, Illinois 60538",
      "city": "MONTGOMERY",
      "state": "Illinois",
      "zip_code": "60538",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - GATES OF PROSPER",
      "address": "1070 S Preston Rd. Suite #60, Prosper, TX",
      "city": "Prosper",
      "state": "TX",
      "zip_code": "75078",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LOUIS JOLIET MALL",
      "address": "3340 MALL LOOP DR SPACE 2, JOLIET, Illinois 60431",
      "city": "JOLIET",
      "state": "Illinois",
      "zip_code": "60431",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FOX VALLEY S C",
      "address": "4 FOX VALLEY CTR, AURORA, Illinois 60504",
      "city": "AURORA",
      "state": "Illinois",
      "zip_code": "60504",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE SHOPS @ NORTHFLD",
      "address": "8568 E 49TH AVE, DENVER, Colorado 80238",
      "city": "DENVER",
      "state": "Colorado",
      "zip_code": "80238",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ALGONQUIN",
      "address": "800 S RANDALL RD, ALGONQUIN, Illinois 60102",
      "city": "ALGONQUIN",
      "state": "Illinois",
      "zip_code": "60102",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CASTLE ROCK",
      "address": "5050 Factory Shops Blvd Space #480, Castle Rock, CO",
      "city": "Castle Rock",
      "state": "CO",
      "zip_code": "80108",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VILLAGE @ FAIRVIEW",
      "address": "301 STACY RD, FAIRVIEW, Texas 75069",
      "city": "FAIRVIEW",
      "state": "Texas",
      "zip_code": "75069",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - STONEBRIAR CENTRE",
      "address": "2601 Preston Rd Space 1230 & 1234, Frisco, TX",
      "city": "Frisco",
      "state": "TX",
      "zip_code": "75034",
      "store_type": "Sephora"
    },
    {
      "store_name": "Credo - Denver",
      "address": "1801 Blake Street, Suite 100, Denver, Colorado 80202",
      "city": "Denver",
      "state": "Colorado",
      "zip_code": "80202",
      "store_type": "Credo"
    },
    {
      "store_name": "SEPHORA - CENTERRA",
      "address": "5897 Sky Pond Dr. Suite K100, Loveland, CO",
      "city": "Loveland",
      "state": "CO",
      "zip_code": "80538",
      "store_type": "Sephora"
    },
    {
      "store_name": "Credo - Plano",
      "address": "7700 Windrose Avenue, Suite G160, Plano, Texas 75024",
      "city": "Plano",
      "state": "Texas",
      "zip_code": "75024",
      "store_type": "Credo"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ROBERTSONS CREEK",
      "address": "5751 LONG PRAIRIE RD, FLOWER MOUND, Texas 75028",
      "city": "FLOWER MOUND",
      "state": "Texas",
      "zip_code": "75028",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PRESTON PARK COLONNADE",
      "address": "2301 Preston Road Suite A, Plano, TX",
      "city": "Plano",
      "state": "TX",
      "zip_code": "75093",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - SHOPS AT WALNUT CREEK",
      "address": "10450 N Town Center Dr, Suite 100, Westminster, CO",
      "city": "Westminster",
      "state": "CO",
      "zip_code": "80021",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MOKENA MARKETPLACE",
      "address": "11325 W LINCOLN HWY, MOKENA, Illinois 60448",
      "city": "MOKENA",
      "state": "Illinois",
      "zip_code": "60448",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside YORKTOWN S C",
      "address": "175 YORKTOWN S/C, LOMBARD, Illinois 60148",
      "city": "LOMBARD",
      "state": "Illinois",
      "zip_code": "60148",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BOWLES CROSSING",
      "address": "5746 S. Wadsworth Blvd. Suite 2800, Littleton, CO",
      "city": "Littleton",
      "state": "CO",
      "zip_code": "80123",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Woodfield Mall",
      "address": "6 Woodfield Shopping Cenyer, Schaumburg, Illinios 60173",
      "city": "Schaumburg",
      "state": "Illinois",
      "zip_code": "60173",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WOODFIELD MALL",
      "address": "3 WOODFIELD MALL, SCHAUMBURG, Illinois 60173",
      "city": "SCHAUMBURG",
      "state": "Illinois",
      "zip_code": "60173",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - OAKBROOK",
      "address": "104 Oakbrook Center, Oak Brook, IL",
      "city": "Oak Brook",
      "state": "IL",
      "zip_code": "60523",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - BURR RIDGE",
      "address": "582 Village Center Drive, Suite 220, Burr Ridge, IL",
      "city": "Burr Ridge",
      "state": "IL",
      "zip_code": "60527",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PLAZA @ ROCKWALL",
      "address": "1015 E I 30, ROCKWALL, Texas 75087",
      "city": "ROCKWALL",
      "state": "Texas",
      "zip_code": "75087",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside RUSHMORE MALL",
      "address": "2200 N MAPLE AVE STE 2204, RAPID CITY, South Dakota 57701",
      "city": "RAPID CITY",
      "state": "South Dakota",
      "zip_code": "57701",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - GRAPEVINE MILLS",
      "address": "3000 Grapevine Mills Pkwy, Space #210, Grapevine, TX",
      "city": "Grapevine",
      "state": "TX",
      "zip_code": "76051",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - DALLAS GALLERIA",
      "address": "13350 N. Dallas Parkway, Suite 1250, Dallas, TX",
      "city": "Dallas",
      "state": "TX",
      "zip_code": "75240",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - MACARTHUR PARK",
      "address": "7601 N MacArthur Blvd, Irving, TX",
      "city": "Irving",
      "state": "TX",
      "zip_code": "75063",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LINCOLN MARKETPLACE (Matteson)",
      "address": "4451 PROMENADE WAY, MATTESON, Illinois 60443",
      "city": "MATTESON",
      "state": "Illinois",
      "zip_code": "60443",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - NORTH PARK",
      "address": "8687 N Cntral Expwy, Suite 2260, Dallas, TX",
      "city": "Dallas",
      "state": "TX",
      "zip_code": "75225",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - PRESIDIO TOWNE CROSSING",
      "address": "2345 Porter Creek Road, Fort Worth, TX",
      "city": "Fort Worth",
      "state": "TX",
      "zip_code": "76177",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - SHOPS OF DOWNTOWN OAK PARK",
      "address": "1145 Lake Street, Oak Park, IL",
      "city": "Oak Park",
      "state": "IL",
      "zip_code": "60301",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTH EAST MALL",
      "address": "1101 MELBOURNE RD STE 5000, HURST, Texas 76053",
      "city": "HURST",
      "state": "Texas",
      "zip_code": "76053",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WEST VILLAGE",
      "address": "3699 McKinney Ave. Suite 520, Dallas, TX",
      "city": "Dallas",
      "state": "TX",
      "zip_code": "75204",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHAVEN TOWNE CTR",
      "address": "6620 TOWNE CENTER LOOP STE E, SOUTHAVEN, Mississippi 38671",
      "city": "SOUTHAVEN",
      "state": "Mississippi",
      "zip_code": "38671",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Credo - Bucktown",
      "address": "1659 North Damen Ave, Chicago, Illinois 60647",
      "city": "Chicago",
      "state": "Illinois",
      "zip_code": "60647",
      "store_type": "Credo"
    },
    {
      "store_name": "SEPHORA - SADDLE CREEK",
      "address": "2 South Garfield Avenue, Suite 120, Germantown, TN",
      "city": "Germantown",
      "state": "TN",
      "zip_code": "38138",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Michigan Avenue",
      "address": "55 E Grand Avenue, Chicago, Illinios 60611",
      "city": "Chicago",
      "state": "Illinois",
      "zip_code": "60611",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - MICHIGAN AVENUE",
      "address": "605 North Michigan Avenue, Chicago, IL",
      "city": "Chicago",
      "state": "IL",
      "zip_code": "60611",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPPE OF PRARIE RDG",
      "address": "10225 77TH ST, PLEASANT PRAIRIE, Wisconsin 53158",
      "city": "PLEASANT PRAIRIE",
      "state": "Wisconsin",
      "zip_code": "53158",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside RIDGMAR MALL",
      "address": "1900 GREEN OAKS RD, FORT WORTH, Texas 76116",
      "city": "FORT WORTH",
      "state": "Texas",
      "zip_code": "76116",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE PARKS MALL",
      "address": "3851 S COOPER ST, ARLINGTON, Texas 76015",
      "city": "ARLINGTON",
      "state": "Texas",
      "zip_code": "76015",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CARRIAGE CROSSING",
      "address": "4630 Merchants Park Circle, Suite 709, Collierville, TN",
      "city": "Collierville",
      "state": "TN",
      "zip_code": "38017",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHRIDGE SHPG CNTR",
      "address": "5350 S 76TH ST, GREENDALE, Wisconsin 53129",
      "city": "GREENDALE",
      "state": "Wisconsin",
      "zip_code": "53129",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - 5000 SOUTH HULEN",
      "address": "4801 Overton Ridge, Suite 124, Fort Worth, TX",
      "city": "Fort Worth",
      "state": "TX",
      "zip_code": "76132",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WESTFLD S T @ S LAKE",
      "address": "1890 SOUTHLAKE MALL, MERRILLVILLE, Indiana 46410",
      "city": "MERRILLVILLE",
      "state": "Indiana",
      "zip_code": "46410",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CEDAR HILL VLG",
      "address": "333 N HWY 67, CEDAR HILL, Texas 75104",
      "city": "CEDAR HILL",
      "state": "Texas",
      "zip_code": "75104",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WEST ACRES MALL",
      "address": "3902 13th Ave. South Suite 501, Fargo, ND",
      "city": "Fargo",
      "state": "ND",
      "zip_code": "58103",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BURLESON TOWN CTR",
      "address": "877 NE ALSBURY BLVD, BURLESON, Texas 76028",
      "city": "BURLESON",
      "state": "Texas",
      "zip_code": "76028",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LONGVIEW MALL",
      "address": "3550 MCCANN RD, LONGVIEW, Texas 75605",
      "city": "LONGVIEW",
      "state": "Texas",
      "zip_code": "75605",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WAXAHACHIE CROSSING",
      "address": "1441 N HWY 77, WAXAHACHIE, Texas 75165",
      "city": "WAXAHACHIE",
      "state": "Texas",
      "zip_code": "75165",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TIPPECANOE MALL",
      "address": "2415 SAGAMORE PKWY S 52, LAFAYETTE, Indiana 47905",
      "city": "LAFAYETTE",
      "state": "Indiana",
      "zip_code": "47905",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PORTERS VALE",
      "address": "410 PORTERS VALE BLVD, VALPARAISO, Indiana 46383",
      "city": "VALPARAISO",
      "state": "Indiana",
      "zip_code": "46383",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside REGAL COURT S C",
      "address": "7451 YOUREE DR, SHREVEPORT, Louisiana 71105",
      "city": "SHREVEPORT",
      "state": "Louisiana",
      "zip_code": "71105",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTH PLAINS MALL",
      "address": "6002 SLIDE RD-BLDG A, LUBBOCK, Texas 79414",
      "city": "LUBBOCK",
      "state": "Texas",
      "zip_code": "79414",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside METROPOLIS",
      "address": "2611 E MAIN ST, PLAINFIELD, Indiana 46168",
      "city": "PLAINFIELD",
      "state": "Indiana",
      "zip_code": "46168",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MILLER HILL MALL",
      "address": "1600 A MILLER TRUNK HWY STE 4, DULUTH, Minnesota 55811",
      "city": "DULUTH",
      "state": "Minnesota",
      "zip_code": "55811",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GREENTREE MALL",
      "address": "757 E LEWIS & CLRK PKY STE 701, CLARKSVILLE, Indiana 47129",
      "city": "CLARKSVILLE",
      "state": "Indiana",
      "zip_code": "47129",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside KIRKWOOD MALL",
      "address": "850 KIRKWOOD MALL, BISMARCK, North Dakota 58504",
      "city": "BISMARCK",
      "state": "North Dakota",
      "zip_code": "58504",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL OF ABILENE",
      "address": "4310 BUFFALO GAP RD, ABILENE, Texas 79606",
      "city": "ABILENE",
      "state": "Texas",
      "zip_code": "79606",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE VLG AT BAY PARK",
      "address": "800 WILLARD DR, ASHWAUBENON, Wisconsin 54304",
      "city": "ASHWAUBENON",
      "state": "Wisconsin",
      "zip_code": "54304",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PAUL BUNYAN MALL",
      "address": "1401 PAUL BUNYAN DR NW STE 2, BEMIDJI, Minnesota 56601",
      "city": "BEMIDJI",
      "state": "Minnesota",
      "zip_code": "56601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - GREENWOOD",
      "address": "1251 US Highway 31 N, Greenwood, IN",
      "city": "Greenwood",
      "state": "IN",
      "zip_code": "46142",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside HAMILTON TOWNE CTR",
      "address": "13900 HOARD DR, NOBLESVILLE, Indiana 46060",
      "city": "NOBLESVILLE",
      "state": "Indiana",
      "zip_code": "46060",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL@BARNES CROSSING",
      "address": "1001 BARNES CROSSING RD STE300, TUPELO, Mississippi 38804",
      "city": "TUPELO",
      "state": "Mississippi",
      "zip_code": "38804",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside RICHLAND MALL",
      "address": "6001 W WACO DR, WACO, Texas 76710",
      "city": "WACO",
      "state": "Texas",
      "zip_code": "76710",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - NASHVILLE WEST",
      "address": "6722 Charlotte Pike, Suite 105, Nashville, TN",
      "city": "Nashville",
      "state": "TN",
      "zip_code": "37209",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - OPRY MILLS",
      "address": "302 Opry Mills Drive, Nashville, TN",
      "city": "Nashville",
      "state": "TN",
      "zip_code": "37214",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside JEFFERSON MALL",
      "address": "4803 OUTER LOOP RD, LOUISVILLE, Kentucky 40219",
      "city": "LOUISVILLE",
      "state": "Kentucky",
      "zip_code": "40219",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CROSSROADS MALL",
      "address": "6580 S WESTNEDGE AVE, PORTAGE, Michigan 49024",
      "city": "PORTAGE",
      "state": "Michigan",
      "zip_code": "49024",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PROVIDENCE MARKETPLACE",
      "address": "401 S. Mt. Juliet Rd., #300, Mt. Juliet, TN",
      "city": "Mt. Juliet",
      "state": "TN",
      "zip_code": "37122",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside KILLEEN MALL",
      "address": "2100 S W S YOUNG DR STE 2000, KILLEEN, Texas 76543",
      "city": "KILLEEN",
      "state": "Texas",
      "zip_code": "76543",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WOODLAND MALL (Grand Rapids)",
      "address": "3115 28th St. SE Suite F-101, Grand Rapids, MI",
      "city": "Grand Rapids",
      "state": "MI",
      "zip_code": "49512",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WOODLAND SHOPG CNTR (Grand Rapids)",
      "address": "3225 28TH ST SE, GRAND RAPIDS, Michigan 49512",
      "city": "GRAND RAPIDS",
      "state": "Michigan",
      "zip_code": "49512",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - THE AVENUE MURFREESBORO",
      "address": "2615 Medical Center Pkwy Space 1790, Murfreesboro, TN",
      "city": "Murfreesboro",
      "state": "TN",
      "zip_code": "37129",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MARKET ST @ FLOWOOD",
      "address": "200 MARKET ST, FLOWOOD, Mississippi 39232",
      "city": "FLOWOOD",
      "state": "Mississippi",
      "zip_code": "39232",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MIDLAND PARK MALL",
      "address": "4511 N MIDKIFF RD, MIDLAND, Texas 79705",
      "city": "MIDLAND",
      "state": "Texas",
      "zip_code": "79705",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ALEXANDRIA MALL",
      "address": "3541 MASONIC DR, ALEXANDRIA, Louisiana 71301",
      "city": "ALEXANDRIA",
      "state": "Louisiana",
      "zip_code": "71301",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside POST OAK MALL",
      "address": "1500 HARVEY RD, COLLEGE STATION, Texas 77840",
      "city": "COLLEGE STATION",
      "state": "Texas",
      "zip_code": "77840",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CENTURY SQUARE",
      "address": "1133 University Dr Suite 300, College Station, TX",
      "city": "College Station",
      "state": "TX",
      "zip_code": "77840",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FLORENCE MALL",
      "address": "6000 FLORENCE MALL, FLORENCE, Kentucky 41042",
      "city": "FLORENCE",
      "state": "Kentucky",
      "zip_code": "41042",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MUSIC CITY MALL",
      "address": "4101 E 42ND ST, ODESSA, Texas 79762",
      "city": "ODESSA",
      "state": "Texas",
      "zip_code": "79762",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DAKOTA SQUARE",
      "address": "2400 10TH ST SW, MINOT, North Dakota 58701",
      "city": "MINOT",
      "state": "North Dakota",
      "zip_code": "58701",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside UNIVERSITY OAKS S C",
      "address": "151 UNIVERSITY OAKS, ROUND ROCK, Texas 78665",
      "city": "ROUND ROCK",
      "state": "Texas",
      "zip_code": "78665",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ROOKWOOD PAVILION",
      "address": "2692 Madison Rd Ste 10A, Cincinnati, OH",
      "city": "Cincinnati",
      "state": "OH",
      "zip_code": "45208",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CORONADO CENTER",
      "address": "6600 MENAUL BLVD NE STE 3000, ALBUQUERQUE, New Mexico 87110",
      "city": "ALBUQUERQUE",
      "state": "New Mexico",
      "zip_code": "87110",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LAKELINE MALL",
      "address": "11200 LAKELINE MALL DR, CEDAR PARK, Texas 78613",
      "city": "CEDAR PARK",
      "state": "Texas",
      "zip_code": "78613",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside COTTONWOOD MALL",
      "address": "10000 COORS BYPASS NW, ALBUQUERQUE, New Mexico 87114",
      "city": "ALBUQUERQUE",
      "state": "New Mexico",
      "zip_code": "87114",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DAYTON MALL",
      "address": "2700 MIAMISBURG-CENTERVILLE RD, CENTERVILLE, Ohio 45459",
      "city": "CENTERVILLE",
      "state": "Ohio",
      "zip_code": "45459",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TECH RIDGE CTR",
      "address": "12351 N IH-35, AUSTIN, Texas 78753",
      "city": "AUSTIN",
      "state": "Texas",
      "zip_code": "78753",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TEAS CROSSING",
      "address": "3165 INTERSTATE 45 N, CONROE, Texas 77304",
      "city": "CONROE",
      "state": "Texas",
      "zip_code": "77304",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - FAYETTE MALL (Lexington)",
      "address": "3401 Nicholasville Road, Suite #C326, Lexington, KY",
      "city": "Lexington",
      "state": "KY",
      "zip_code": "40503",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - LANSING",
      "address": "2916 Towne Centre Boulevard, Lansing, MI",
      "city": "Lansing",
      "state": "MI",
      "zip_code": "48912",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MESA MALL",
      "address": "2424 US 6TH AND 50TH, GRAND JUNCTION, Colorado 81505",
      "city": "GRAND JUNCTION",
      "state": "Colorado",
      "zip_code": "81505",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - DAYTON",
      "address": "4421 Glengarry Drive, Suite 126, Dayton, OH",
      "city": "Dayton",
      "state": "OH",
      "zip_code": "45440",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - BARTON CREEK",
      "address": "2901 Capitol of Texas Hwy So.,Suite M02A, Austin, TX",
      "city": "Austin",
      "state": "TX",
      "zip_code": "78746",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BARTON CREEK SQ",
      "address": "2901 S CAPITOL OF TEXAS HWY, AUSTIN, Texas 78746",
      "city": "AUSTIN",
      "state": "Texas",
      "zip_code": "78746",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SUNSET VALLEY VILLAGE",
      "address": "5601 Brodie Lane Suite 500, Austin, TX",
      "city": "Austin",
      "state": "TX",
      "zip_code": "78745",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WOODLANDS MALL",
      "address": "1201 LAKE WOODLANDS DR STE 500, THE WOODLANDS, Texas 77380",
      "city": "THE WOODLANDS",
      "state": "Texas",
      "zip_code": "77380",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHPRK MEADOWS S C",
      "address": "9500 S IH-35 STE H, AUSTIN, Texas 78748",
      "city": "AUSTIN",
      "state": "Texas",
      "zip_code": "78748",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PARKDALE MALL",
      "address": "6455 EASTEX FRWY, BEAUMONT, Texas 77706",
      "city": "BEAUMONT",
      "state": "Texas",
      "zip_code": "77706",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DEERBROOK MALL",
      "address": "20131 HWY 59N STE 3000, HUMBLE, Texas 77338",
      "city": "HUMBLE",
      "state": "Texas",
      "zip_code": "77338",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WILLOWBROOK MALL",
      "address": "7925 FM 1960 RD STE 7000, HOUSTON, Texas 77070",
      "city": "HOUSTON",
      "state": "Texas",
      "zip_code": "77070",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ATASCOCITA COMMONS",
      "address": "7015 FM 1960E, Humble, TX",
      "city": "Humble",
      "state": "TX",
      "zip_code": "77346",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - WILLOWBROOK PARK",
      "address": "7925 FM 1960, Space 1554, Houston, TX",
      "city": "Houston",
      "state": "TX",
      "zip_code": "77070",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PRIEN LAKE MALL",
      "address": "312 W PRIEN LAKE RD, LAKE CHARLES, Louisiana 70601",
      "city": "LAKE CHARLES",
      "state": "Louisiana",
      "zip_code": "70601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GREEN OAK VILLAGE PL",
      "address": "9480 VILLAGE PLACE BLVD, BRIGHTON, Michigan 48116",
      "city": "BRIGHTON",
      "state": "Michigan",
      "zip_code": "48116",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside STONECREEK CROSSING",
      "address": "800 BARNES ST, SAN MARCOS, Texas 78666",
      "city": "SAN MARCOS",
      "state": "Texas",
      "zip_code": "78666",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - MEMORIAL CITY",
      "address": "303 Memorial City Way, Suite # 700, Houston, TX",
      "city": "Houston",
      "state": "TX",
      "zip_code": "77024",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - HOUSTON GALLERIA",
      "address": "5015 Westheimer, Suite 2380, Houston, TX",
      "city": "Houston",
      "state": "TX",
      "zip_code": "77056",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Houston Galleria",
      "address": "5192 Hidalgo Street, Houston, Texas 77056",
      "city": "Houston",
      "state": "Texas",
      "zip_code": "77056",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FASHION SQUARE MALL",
      "address": "4600 BAY RD, SAGINAW, Michigan 48604",
      "city": "SAGINAW",
      "state": "Michigan",
      "zip_code": "48604",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GENESEE VALLEY CNTR",
      "address": "3535 S LINDEN RD, FLINT, Michigan 48507",
      "city": "FLINT",
      "state": "Michigan",
      "zip_code": "48507",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TRADEMART S C",
      "address": "14659 N US HWY 25 E, CORBIN, Kentucky 40701",
      "city": "CORBIN",
      "state": "Kentucky",
      "zip_code": "40701",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TOWN CTR @ CREEKSIDE",
      "address": "215 CREEKSIDE WAY, NEW BRAUNFELS, Texas 78130",
      "city": "NEW BRAUNFELS",
      "state": "Texas",
      "zip_code": "78130",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside STIRLING LAFAYET S C",
      "address": "3125 LOUISIANA AVE, LAFAYETTE, Louisiana 70501",
      "city": "LAFAYETTE",
      "state": "Louisiana",
      "zip_code": "70501",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FAIRMONT CTR",
      "address": "5120 FAIRMONT PKWY, PASADENA, Texas 77505",
      "city": "PASADENA",
      "state": "Texas",
      "zip_code": "77505",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - TWELVE OAKS",
      "address": "27846 Novi Road Space #E117, Novi, MI",
      "city": "Novi",
      "state": "MI",
      "zip_code": "48377",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside COURTLAND CTR",
      "address": "4190 E COURT ST STE 500, BURTON, Michigan 48509",
      "city": "BURTON",
      "state": "Michigan",
      "zip_code": "48509",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TURTLE CREEK MALL (Hattiesburg)",
      "address": "1000 TURTLE CREEK DR, HATTIESBURG, Mississippi 39402",
      "city": "HATTIESBURG",
      "state": "Mississippi",
      "zip_code": "39402",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FIRST COLONY MALL",
      "address": "16529 SOUTHWEST FRWY, SUGAR LAND, Texas 77479",
      "city": "SUGAR LAND",
      "state": "Texas",
      "zip_code": "77479",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WESTLAND SHOPG CNTR (Westland)",
      "address": "35000 W WARREN RD, WESTLAND, Michigan 48185",
      "city": "WESTLAND",
      "state": "Michigan",
      "zip_code": "48185",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BRAZOS TOWN COMMONS",
      "address": "24201 BRAZOS TOWN CROSSING, ROSENBERG, Texas 77471",
      "city": "ROSENBERG",
      "state": "Texas",
      "zip_code": "77471",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE CROSSING @ 288",
      "address": "2500 SMITH RANCH RD, PEARLAND, Texas 77584",
      "city": "PEARLAND",
      "state": "Texas",
      "zip_code": "77584",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - RIVER MARKETPLACE",
      "address": "4419 Ambassador Caffery Pkwy Suite #200, Lafayette, LA",
      "city": "Lafayette",
      "state": "LA",
      "zip_code": "70508",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - BAYBROOK",
      "address": "1168 Baybrook Mall, Friendswood, TX",
      "city": "Friendswood",
      "state": "TX",
      "zip_code": "77546",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHLAND S C (Taylor)",
      "address": "23000 EUREKA RD STE A3, TAYLOR, Michigan 48180",
      "city": "TAYLOR",
      "state": "Michigan",
      "zip_code": "48180",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ACADIAN VILLAGE",
      "address": "3535 Perkins RD, Baton Rouge, LA",
      "city": "Baton Rouge",
      "state": "LA",
      "zip_code": "70808",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ROLLING OAKS MALL",
      "address": "6909 N LOOP 1604 E, SAN ANTONIO, Texas 78247",
      "city": "SAN ANTONIO",
      "state": "Texas",
      "zip_code": "78247",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BLOOMFIELD PLAZA",
      "address": "6520A Telegraph Rd, Bloomfield Hills, MI",
      "city": "Bloomfield Hills",
      "state": "MI",
      "zip_code": "48301",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - THE RIM",
      "address": "17503 La Cantera Parkway Space #915, San Antonio, TX",
      "city": "San Antonio",
      "state": "TX",
      "zip_code": "78256",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL OF LOUISIANA",
      "address": "6201 BLUEBONNET BLVD, BATON ROUGE, Louisiana 70836",
      "city": "BATON ROUGE",
      "state": "Louisiana",
      "zip_code": "70836",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - The Shops at La Cantera",
      "address": "15900 La Cantera Parkway, San Antonio, Texas 78256",
      "city": "San Antonio",
      "state": "Texas",
      "zip_code": "78256",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VICTORY LAKES TWNCTR",
      "address": "2520 GULF FWY S, LEAGUE CITY, Texas 77573",
      "city": "LEAGUE CITY",
      "state": "Texas",
      "zip_code": "77573",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - EASTON TOWN CENTER",
      "address": "4174 The Strand, Space #321, Columbus, OH",
      "city": "Columbus",
      "state": "OH",
      "zip_code": "43219",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - SOMERSET",
      "address": "2800 W. Big Beaver Road #S 218, Troy, MI",
      "city": "Troy",
      "state": "MI",
      "zip_code": "48084",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TURKEY CREEK S C",
      "address": "11534 PARKSIDE DR, FARRAGUT, Tennessee 37934",
      "city": "FARRAGUT",
      "state": "Tennessee",
      "zip_code": "37934",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside OAKLAND MALL",
      "address": "700 W 14 MILE RD, TROY, Michigan 48083",
      "city": "TROY",
      "state": "Michigan",
      "zip_code": "48083",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ALAMO RANCH MRKTPL",
      "address": "5335 W LOOP 1604 N, SAN ANTONIO, Texas 78253",
      "city": "SAN ANTONIO",
      "state": "Texas",
      "zip_code": "78253",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PARTRIDGE CREEK",
      "address": "17410 Hall Rd., Suite 167, Clinton Township, MI",
      "city": "Clinton Township",
      "state": "MI",
      "zip_code": "48038",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ASHLAND TOWN CTR",
      "address": "500 WINCHESTER AVE, ASHLAND, Kentucky 41101",
      "city": "ASHLAND",
      "state": "Kentucky",
      "zip_code": "41101",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside RIMROCK MALL",
      "address": "140 S 24TH ST W, BILLINGS, Montana 59102",
      "city": "BILLINGS",
      "state": "Montana",
      "zip_code": "59102",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VICTORIA MALL",
      "address": "8106 N NAVARRO ST, VICTORIA, Texas 77904",
      "city": "VICTORIA",
      "state": "Texas",
      "zip_code": "77904",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PLAZA DEL SOL",
      "address": "2209 VETERANS BLVD, DEL RIO, Texas 78840",
      "city": "DEL RIO",
      "state": "Texas",
      "zip_code": "78840",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside HIRAM SQUARE",
      "address": "5043 JIMMY LEE SMITH PKWY, HIRAM, Georgia 30141",
      "city": "HIRAM",
      "state": "Georgia",
      "zip_code": "30141",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - KENNESAW",
      "address": "400 Ernest W Barrett Pkwy NW, Suite #236, Kennesaw, GA",
      "city": "Kennesaw",
      "state": "GA",
      "zip_code": "30144",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside HUNTINGTON MALL",
      "address": "800 MALL RD, BARBOURSVILLE, West Virginia 25504",
      "city": "BARBOURSVILLE",
      "state": "West Virginia",
      "zip_code": "25504",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - FRENCH QUARTER",
      "address": "414 N. Peters Street, New Orleans, LA",
      "city": "New Orleans",
      "state": "LA",
      "zip_code": "70130",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside AVON CROSSING",
      "address": "1301 CENTER RD, AVON, Ohio 44011",
      "city": "AVON",
      "state": "Ohio",
      "zip_code": "44011",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SHOPPES AT EASTCHASE",
      "address": "7064 EastChase Parkway Suite: C180, Montgomery, AL",
      "city": "Montgomery",
      "state": "AL",
      "zip_code": "36117",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside EDGEWATER PLAZA",
      "address": "2600 BEACH BLVD, BILOXI, Mississippi 39531",
      "city": "BILOXI",
      "state": "Mississippi",
      "zip_code": "39531",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MESILLA VALLEY MALL",
      "address": "700 TELSHOR BLVD STE 6700, LAS CRUCES, New Mexico 88011",
      "city": "LAS CRUCES",
      "state": "New Mexico",
      "zip_code": "88011",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - AVALON ALPHARETTA",
      "address": "3130 Avalon Blvd, Alpharetta, GA",
      "city": "Alpharetta",
      "state": "GA",
      "zip_code": "30009",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTH POINT MALL",
      "address": "2000 N POINT CIR, ALPHARETTA, Georgia 30022",
      "city": "ALPHARETTA",
      "state": "Georgia",
      "zip_code": "30022",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - COLLECTION AT FORSYTH",
      "address": "410 Peachtree Pkwy ST # 146, Cumming, GA",
      "city": "Cumming",
      "state": "GA",
      "zip_code": "30041",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Perimeter Mall",
      "address": "4390 Ashford Dunwoody Road Northeast, Atlanta, Georgia 30346",
      "city": "Atlanta",
      "state": "Georgia",
      "zip_code": "30346",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "Nordstrom - Phipps Plaza",
      "address": "3500 Peachtree Road Northeast, Atlanta, Georgia 30326",
      "city": "Atlanta",
      "state": "Georgia",
      "zip_code": "30326",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - ATLANTIC STATION",
      "address": "260 18th St NW Suite 10120A, Atlanta, GA",
      "city": "Atlanta",
      "state": "GA",
      "zip_code": "30363",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BEL AIR MALL",
      "address": "3400 BELL AIR MALL, MOBILE, Alabama 36606",
      "city": "MOBILE",
      "state": "Alabama",
      "zip_code": "36606",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside EL MERCADO PLAZA",
      "address": "1950 JOE BATTLE BLVD, EL PASO, Texas 79938",
      "city": "EL PASO",
      "state": "Texas",
      "zip_code": "79938",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PEACHTREE CITY",
      "address": "226 City Circle, Suite 640, Peachtree City, GA",
      "city": "Peachtree City",
      "state": "GA",
      "zip_code": "30269",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL OF GEORGIA",
      "address": "3333 BUFORD DR, BUFORD, Georgia 30519",
      "city": "BUFORD",
      "state": "Georgia",
      "zip_code": "30519",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SUNLAND TOWNE CENTRE",
      "address": "655 Sunland Park Dr. Suite J-3, El Paso, TX",
      "city": "El Paso",
      "state": "TX",
      "zip_code": "79912",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BANKS CROSSING S C",
      "address": "240 BANKS CROSSING, FAYETTEVILLE, Georgia 30214",
      "city": "FAYETTEVILLE",
      "state": "Georgia",
      "zip_code": "30214",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PINECREST",
      "address": "311 Park Ave Suite 126, Orange Village, OH",
      "city": "Orange Village",
      "state": "OH",
      "zip_code": "44122",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GRAND CENTRAL MALL",
      "address": "200 GRAND CENTRAL MALL, VIENNA, West Virginia 26105",
      "city": "VIENNA",
      "state": "West Virginia",
      "zip_code": "26105",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SHOPPES AT WEBB GIN",
      "address": "1350 Scenic Hwy S, Suite 332, Snellville, GA",
      "city": "Snellville",
      "state": "GA",
      "zip_code": "30078",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL DE LAS AGUILAS",
      "address": "455 S BIBB ST, EAGLE PASS, Texas 78852",
      "city": "EAGLE PASS",
      "state": "Texas",
      "zip_code": "78852",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE MALL (Johnson City)",
      "address": "2011 N ROAN ST, JOHNSON CITY, Tennessee 37601",
      "city": "JOHNSON CITY",
      "state": "Tennessee",
      "zip_code": "37601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL @ STONECREST",
      "address": "8040 MALL PKWY, LITHONIA, Georgia 30038",
      "city": "LITHONIA",
      "state": "Georgia",
      "zip_code": "30038",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTH POINT S C",
      "address": "1380 HWY 20 W, MCDONOUGH, Georgia 30253",
      "city": "MCDONOUGH",
      "state": "Georgia",
      "zip_code": "30253",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PEACHTREE MALL",
      "address": "3507 MANCHESTER EXPWY STE E, COLUMBUS, Georgia 31909",
      "city": "COLUMBUS",
      "state": "Georgia",
      "zip_code": "31909",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PROVO TOWNE CENTER",
      "address": "1200 TOWNE CENTRE BLVD STE B, PROVO, Utah 84601",
      "city": "PROVO",
      "state": "Utah",
      "zip_code": "84601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - UNIVERSITY PLACE OREM",
      "address": "575 East University Parkway Suite C-52, Orem, UT",
      "city": "Orem",
      "state": "UT",
      "zip_code": "84097",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - BEECHWOOD",
      "address": "196 Alps Rd Space 151, Athens, GA",
      "city": "Athens",
      "state": "GA",
      "zip_code": "30606",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPS AT SOUTH TOWN",
      "address": "10450 S STATE ST STE 2100, SANDY, Utah 84070",
      "city": "SANDY",
      "state": "Utah",
      "zip_code": "84070",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY FAIR MALL (West Valley City)",
      "address": "3601 S 2700 W, WEST VALLEY CITY, Utah 84119",
      "city": "WEST VALLEY CITY",
      "state": "Utah",
      "zip_code": "84119",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside RIVERDALE CENTER",
      "address": "4185 RIVERDALE RD, RIVERDALE, Utah 84405",
      "city": "RIVERDALE",
      "state": "Utah",
      "zip_code": "84405",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHERN PARK MALL (Youngstown)",
      "address": "7401 MARKET ST, YOUNGSTOWN, Ohio 44512",
      "city": "YOUNGSTOWN",
      "state": "Ohio",
      "zip_code": "44512",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE HIGHLANDS",
      "address": "515 CABELA DR, TRIADELPHIA, West Virginia 26059",
      "city": "TRIADELPHIA",
      "state": "West Virginia",
      "zip_code": "26059",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHENANGO VALLEY MALL",
      "address": "3405 E STATE ST, HERMITAGE, Pennsylvania 16148",
      "city": "HERMITAGE",
      "state": "Pennsylvania",
      "zip_code": "16148",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GRAND TETON MALL",
      "address": "2320 E 17TH ST, IDAHO FALLS, Idaho 83404",
      "city": "IDAHO FALLS",
      "state": "Idaho",
      "zip_code": "83404",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BEAVER VALLEY MALL",
      "address": "200 BEAVER VALLEY MALL, MONACA, Pennsylvania 15061",
      "city": "MONACA",
      "state": "Pennsylvania",
      "zip_code": "15061",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - NORTH CREEK PLAZA",
      "address": "7603 San Dario Ave. SPACE #A0L, Laredo, TX",
      "city": "Laredo",
      "state": "TX",
      "zip_code": "78045",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ROBINSON TOWN CTR",
      "address": "2000 ROBINSON TOWN CTR, PITTSBURGH, Pennsylvania 15205",
      "city": "PITTSBURGH",
      "state": "Pennsylvania",
      "zip_code": "15205",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL DEL NORTE S C",
      "address": "5300 SAN DARIO, LAREDO, Texas 78041",
      "city": "LAREDO",
      "state": "Texas",
      "zip_code": "78041",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MILL CREEK MALL",
      "address": "840 MILL CREEK MALL, ERIE, Pennsylvania 16565",
      "city": "ERIE",
      "state": "Pennsylvania",
      "zip_code": "16565",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Ross Park",
      "address": "1000 Ross Park Mall Drive, Pittsburgh, Pennsylvania 15237",
      "city": "Pittsburgh",
      "state": "Pennsylvania",
      "zip_code": "15237",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY HILLS MALL",
      "address": "1970 US HWY 70 SE, HICKORY, North Carolina 28602",
      "city": "HICKORY",
      "state": "North Carolina",
      "zip_code": "28602",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FLAGSTAFF MALL",
      "address": "4600 N US HWY 89, FLAGSTAFF, Arizona 86004",
      "city": "FLAGSTAFF",
      "state": "Arizona",
      "zip_code": "86004",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BIRKDALE VILLAGE",
      "address": "16835 Birkdale Commons Parkway, Unit E, Huntersville, NC",
      "city": "Huntersville",
      "state": "NC",
      "zip_code": "28078",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - RIVERGATE",
      "address": "14151 Steele Creek Rd., Suite 100, Charlotte, NC",
      "city": "Charlotte",
      "state": "NC",
      "zip_code": "28273",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - AUGUSTA",
      "address": "3450 Wrightsboro Road Suite #2520, Augusta, GA",
      "city": "Augusta",
      "state": "GA",
      "zip_code": "30909",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY VIEW MALL (Roanoke)",
      "address": "4832 VALLEY VIEW BLVD NW, ROANOKE, Virginia 24012",
      "city": "ROANOKE",
      "state": "Virginia",
      "zip_code": "24012",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CONCORD MILLS",
      "address": "8111 Concord Mills Blvd Suite 235A, Concord, NC",
      "city": "Concord",
      "state": "NC",
      "zip_code": "28027",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CAROLINA PLACE MALL",
      "address": "11017 CAROLINA PLACE PKWY, PINEVILLE, North Carolina 28134",
      "city": "PINEVILLE",
      "state": "North Carolina",
      "zip_code": "28134",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Southpark",
      "address": "4400 Sharon Road, Charlotte, North Carolina 28211",
      "city": "Charlotte",
      "state": "North Carolina",
      "zip_code": "28211",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside HANES MALL",
      "address": "3320 SILAS CREEK PKWY STE 460, WINSTON SALEM, North Carolina 27103",
      "city": "WINSTON SALEM",
      "state": "North Carolina",
      "zip_code": "27103",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WINSTON-SALEM",
      "address": "3320 Silas Creek Pkwy, Suite #760, Winston Salem, NC",
      "city": "Winston Salem",
      "state": "NC",
      "zip_code": "27103",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - THRUWAY SHOPPING CENTER",
      "address": "256 S. Stratford Rd, Winston-Salem, NC",
      "city": "Winston-Salem",
      "state": "NC",
      "zip_code": "27103",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GALLERIA MALL (Johnstown)",
      "address": "560 GALLERIA DR, JOHNSTOWN, Pennsylvania 15904",
      "city": "JOHNSTOWN",
      "state": "Pennsylvania",
      "zip_code": "15904",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPS @ RIO GRANDE",
      "address": "419 E TRENTON RD, EDINBURG, Texas 78539",
      "city": "EDINBURG",
      "state": "Texas",
      "zip_code": "78539",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MCKINLEY MALL",
      "address": "6 MCKINLEY MALL, BLASDELL, New York 14219",
      "city": "BLASDELL",
      "state": "New York",
      "zip_code": "14219",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - TRENHOLM PLAZA",
      "address": "4840 Forest Drive Space 9c, Columbia, SC",
      "city": "Columbia",
      "state": "SC",
      "zip_code": "29206",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FOUR SEASONS TOWN CT",
      "address": "100 FOUR SEASONS TOWN CTR, GREENSBORO, North Carolina 27407",
      "city": "GREENSBORO",
      "state": "North Carolina",
      "zip_code": "27407",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLE VISTA S C",
      "address": "2006 S EXPY 83, HARLINGEN, Texas 78552",
      "city": "HARLINGEN",
      "state": "Texas",
      "zip_code": "78552",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY CROSSING S C",
      "address": "715 E EXPRESSWAY 83, WESLACO, Texas 78596",
      "city": "WESLACO",
      "state": "Texas",
      "zip_code": "78596",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - LA PLAZA",
      "address": "2200 S. 10th Street, Space AO1B, McAllen, TX",
      "city": "McAllen",
      "state": "TX",
      "zip_code": "78503",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside RIVER RIDGE MALL",
      "address": "3409 CANDLERS MOUNTAIN RD, LYNCHBURG, Virginia 24502",
      "city": "LYNCHBURG",
      "state": "Virginia",
      "zip_code": "24502",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - EASTVIEW PLAZA",
      "address": "8202 Transit Rd., Williamsville, NY",
      "city": "Williamsville",
      "state": "NY",
      "zip_code": "14221",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SUNRISE MALL TX",
      "address": "2370 N EXPWY STE 2000, BROWNSVILLE, Texas 78526",
      "city": "BROWNSVILLE",
      "state": "Texas",
      "zip_code": "78526",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ALAMANCE CROSSING",
      "address": "3141 WATERMILL DR, BURLINGTON, North Carolina 27215",
      "city": "BURLINGTON",
      "state": "North Carolina",
      "zip_code": "27215",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SUPERST'N SPRINGS ML",
      "address": "6525 E SOUTHERN AVE, MESA, Arizona 85206",
      "city": "MESA",
      "state": "Arizona",
      "zip_code": "85206",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALDOSTA MALL",
      "address": "1700 NORMAN DR, VALDOSTA, Georgia 31601",
      "city": "VALDOSTA",
      "state": "Georgia",
      "zip_code": "31601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - THE QUARTER",
      "address": "15169 N Scottsdale Rd., Suite #110, Scottsdale, AZ",
      "city": "Scottsdale",
      "state": "AZ",
      "zip_code": "85254",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - PARADISE VALLEY",
      "address": "12646 N Tatum Blvd Suite 100, Phoenix, AZ",
      "city": "Phoenix",
      "state": "AZ",
      "zip_code": "85032",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - TEMPE MARKETPLACE",
      "address": "2000 E. Rio Salado Parkway, Suite 1011, Tempe, AZ",
      "city": "Tempe",
      "state": "AZ",
      "zip_code": "85281",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TEMPE MARKETPLACE",
      "address": "1900 E RIO SALADO PKWY STE 140, TEMPE, Arizona 85281",
      "city": "TEMPE",
      "state": "Arizona",
      "zip_code": "85281",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - NORTERRA",
      "address": "2460 West Happy Valley Road, Suite 1161, Phoenix, AZ",
      "city": "Phoenix",
      "state": "AZ",
      "zip_code": "85085",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TUCSON SPECTRUM",
      "address": "5265 S CALLE SANTA CRUZ, TUCSON, Arizona 85706",
      "city": "TUCSON",
      "state": "Arizona",
      "zip_code": "85706",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside APPLE BLOSSOM MALL",
      "address": "1850 APPLE BLOSSOM DR, WINCHESTER, Virginia 22601",
      "city": "WINCHESTER",
      "state": "Virginia",
      "zip_code": "22601",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PROMNDE@ CASA GRANDE",
      "address": "1041 N PROMENADE PKWY, CASA GRANDE, Arizona 85194",
      "city": "CASA GRANDE",
      "state": "Arizona",
      "zip_code": "85194",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WESTGATE GLENDALE",
      "address": "6800 N. 95th Avenue, Suite 320, Glendale, AZ",
      "city": "Glendale",
      "state": "AZ",
      "zip_code": "85305",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PALM VALLEY CORNERST",
      "address": "13333 W MCDOWELL RD, GOODYEAR, Arizona 85395",
      "city": "GOODYEAR",
      "state": "Arizona",
      "zip_code": "85395",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Streets at Southpoint",
      "address": "6910 Fayetteville Road, Suite 500, Durham, North Carolina 27713",
      "city": "Durham",
      "state": "North Carolina",
      "zip_code": "27713",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY MALL (Hagerstown)",
      "address": "17301 VALLEY MALL RD STE 400, HAGERSTOWN, Maryland 21740",
      "city": "HAGERSTOWN",
      "state": "Maryland",
      "zip_code": "21740",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BRIER CREEK COMMONS",
      "address": "8331 Brier Creek Parkway, suite 103, Raleigh, NC",
      "city": "Raleigh",
      "state": "NC",
      "zip_code": "27617",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GREECE RIDGE CTR",
      "address": "231 GREECE RIDGE CTR DR, GREECE, New York 14626",
      "city": "GREECE",
      "state": "New York",
      "zip_code": "14626",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MARIPOSA WEST PLAZA",
      "address": "220 W MARIPOSA RD, NOGALES, Arizona 85621",
      "city": "NOGALES",
      "state": "Arizona",
      "zip_code": "85621",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PITTSFORD",
      "address": "2780 Monroe Avenue Suite 212, Rochester, NY",
      "city": "Rochester",
      "state": "NY",
      "zip_code": "14618",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - VILLAGE DISTRICT",
      "address": "2023 Cameron Street, Raleigh, NC",
      "city": "Raleigh",
      "state": "NC",
      "zip_code": "27605",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside OGLETHORPE MALL",
      "address": "7804 ABERCORN ST, SAVANNAH, Georgia 31406",
      "city": "SAVANNAH",
      "state": "Georgia",
      "zip_code": "31406",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DULLES TOWN CTR",
      "address": "21030 DULLES TOWN CIR, STERLING, Virginia 20166",
      "city": "STERLING",
      "state": "Virginia",
      "zip_code": "20166",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHWOODS MALL (Charleston)",
      "address": "2150 NORTHWOODS BLVD UNIT E100, N CHARLESTON, South Carolina 29406",
      "city": "N CHARLESTON",
      "state": "South Carolina",
      "zip_code": "29406",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside POTOMAC MILLS MALL",
      "address": "2700 POTOMAC MILLS CIR, WOODBRIDGE, Virginia 22192",
      "city": "WOODBRIDGE",
      "state": "Virginia",
      "zip_code": "22192",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CHESTERFIELD MALL",
      "address": "11500 MIDLOTHIAN TPKE, RICHMOND, Virginia 23235",
      "city": "RICHMOND",
      "state": "Virginia",
      "zip_code": "23235",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Tysons Corner",
      "address": "8075 Tysons Corner Center, McLean, Virginia 22102",
      "city": "McLean",
      "state": "Virginia",
      "zip_code": "22102",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - MOSAIC DISTRICT",
      "address": "2921 District Ave, Suite 140, Fairfax, VA",
      "city": "Fairfax",
      "state": "VA",
      "zip_code": "22031",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - NORTH CHARLESTON",
      "address": "4840 Tanger Outlet Blvd, Suite 930, North Charleston, SC",
      "city": "North Charleston",
      "state": "SC",
      "zip_code": "29418",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - STONY POINT VILLAGE",
      "address": "3002B Stony Point Rd, Richmond, VA",
      "city": "Richmond",
      "state": "VA",
      "zip_code": "23235",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SPRINGFIELD MALL (Virginia)",
      "address": "6699 SPRINGFIELD MALL, SPRINGFIELD, Virginia 22150",
      "city": "SPRINGFIELD",
      "state": "Virginia",
      "zip_code": "22150",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ARNOT MALL",
      "address": "3300 CHAMBERS RD STE 5090, HORSEHEADS, New York 14845",
      "city": "HORSEHEADS",
      "state": "New York",
      "zip_code": "14845",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SHOPS AT SUSQUEHANA MARKETPLACE",
      "address": "2567 Brindle Drive, Harrisburg, PA",
      "city": "Harrisburg",
      "state": "PA",
      "zip_code": "17110",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Pentagon City",
      "address": "1400 S Hayes Street, Arlington, Virginia 22202",
      "city": "Arlington",
      "state": "Virginia",
      "zip_code": "22202",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPS @ WHITE OAK VL",
      "address": "4541 S LABURNUM AVE, RICHMOND, Virginia 23231",
      "city": "RICHMOND",
      "state": "Virginia",
      "zip_code": "23231",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - NATIONAL HARBOR",
      "address": "6800 Oxon Hill Rd. Suite 360, Oxon Hill, MD",
      "city": "Oxon Hill",
      "state": "MD",
      "zip_code": "20745",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHPARK MALL (Colonial Heights)",
      "address": "6 SOUTHPARK MALL, COLONIAL HEIGHTS, Virginia 23834",
      "city": "COLONIAL HEIGHTS",
      "state": "Virginia",
      "zip_code": "23834",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - MILL STATION",
      "address": "10240 Mill Run Circle, Suite 100, Owings Mills, MD",
      "city": "Owings Mills",
      "state": "MD",
      "zip_code": "21117",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FOREST VILLAGE PARK",
      "address": "3401 DONNELL DR, FORESTVILLE, Maryland 20747",
      "city": "FORESTVILLE",
      "state": "Maryland",
      "zip_code": "20747",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GALLERIA SUNSET MALL",
      "address": "1312 W SUNSET RD, HENDERSON, Nevada 89014",
      "city": "HENDERSON",
      "state": "Nevada",
      "zip_code": "89014",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside COASTAL GRAND MALL",
      "address": "1800 COASTAL GRAND CIR, MYRTLE BEACH, South Carolina 29577",
      "city": "MYRTLE BEACH",
      "state": "South Carolina",
      "zip_code": "29577",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPS @ LAKE HAVASU",
      "address": "5651 HWY 95 N, LAKE HAVASU CITY, Arizona 86404",
      "city": "LAKE HAVASU CITY",
      "state": "Arizona",
      "zip_code": "86404",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BERKELEY MALL",
      "address": "607 N BERKELEY BLVD, GOLDSBORO, North Carolina 27534",
      "city": "GOLDSBORO",
      "state": "North Carolina",
      "zip_code": "27534",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Fashion Show Mall",
      "address": "3200 Las Vegas Boulevard South, Las Vegas, Nevada 89109",
      "city": "Las Vegas",
      "state": "Nevada",
      "zip_code": "89109",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside OAKS MALL (Gainesville)",
      "address": "6481 NEWBERRY RD, GAINESVILLE, Florida 32605",
      "city": "GAINESVILLE",
      "state": "Florida",
      "zip_code": "32605",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE MEADOWS SHPG CTR",
      "address": "4400 MEADOWS LANE, LAS VEGAS, Nevada 89107",
      "city": "LAS VEGAS",
      "state": "Nevada",
      "zip_code": "89107",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ANNAPOLIS MALL",
      "address": "1695 ANNAPOLIS MALL, ANNAPOLIS, Maryland 21401",
      "city": "ANNAPOLIS",
      "state": "Maryland",
      "zip_code": "21401",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WHITE MARSH MALL",
      "address": "8200 PERRY HALL BLVD, BALTIMORE, Maryland 21236",
      "city": "BALTIMORE",
      "state": "Maryland",
      "zip_code": "21236",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ANNAPOLIS TOWN CENTER",
      "address": "200 Harker Place, Suite 105, Annapolis, MD",
      "city": "Annapolis",
      "state": "MD",
      "zip_code": "21401",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - MANDARIN LANDING",
      "address": "10601 San Jose Boulevard, Suite 401, Jacksonville, FL",
      "city": "Jacksonville",
      "state": "FL",
      "zip_code": "32257",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - ST JOHNS",
      "address": "10281 Midtown Parkway, Jacksonville, FL",
      "city": "Jacksonville",
      "state": "FL",
      "zip_code": "32246",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NAMPA GATEWAY CTR",
      "address": "1200 N HAPPY VALLEY RD, NAMPA, Idaho 83687",
      "city": "NAMPA",
      "state": "Idaho",
      "zip_code": "83687",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - TOWNE CENTER AT FAYETTEVILLE (Syracuse)",
      "address": "530 Town Drive, Fayetteville, NY",
      "city": "Fayetteville",
      "state": "NY",
      "zip_code": "13066",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WYOMING VALLEY MALL",
      "address": "34 WYOMING VALLEY MALL, WILKES BARRE, Pennsylvania 18702",
      "city": "WILKES BARRE",
      "state": "Pennsylvania",
      "zip_code": "18702",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WESTFIELD SHPNGTOWN",
      "address": "3500 OLEANDER DR, WILMINGTON, North Carolina 28403",
      "city": "WILMINGTON",
      "state": "North Carolina",
      "zip_code": "28403",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VIEWMONT MALL",
      "address": "80 VIEWMONT MALL, SCRANTON, Pennsylvania 18508",
      "city": "SCRANTON",
      "state": "Pennsylvania",
      "zip_code": "18508",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PENINSULA TWN CTR",
      "address": "2071 COLISEUM DR, HAMPTON, Virginia 23666",
      "city": "HAMPTON",
      "state": "Virginia",
      "zip_code": "23666",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CHRISTIANA",
      "address": "118 Christiana Mall, Newark, DE",
      "city": "Newark",
      "state": "DE",
      "zip_code": "19702",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NATURE COAST COMMONS",
      "address": "5181 PEPPER ST, SPRING HILL, Florida 34607",
      "city": "SPRING HILL",
      "state": "Florida",
      "zip_code": "34607",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - LEHIGH VALLEY MALL",
      "address": "835 Lehigh Lifestyle Center, Space #1240, Whitehall, PA",
      "city": "Whitehall",
      "state": "PA",
      "zip_code": "18052",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GREENBRIER MALL",
      "address": "1401 GREENBRIER PKWY STE 3000, CHESAPEAKE, Virginia 23320",
      "city": "CHESAPEAKE",
      "state": "Virginia",
      "zip_code": "23320",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - LAWRENCE PARK SHOPPING CENTER",
      "address": "1991 Sproul Rd, Suite 42-a, Broomall, PA",
      "city": "Broomall",
      "state": "PA",
      "zip_code": "19008",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside YUMA PALMS S C",
      "address": "1375 S YUMA PALMS PKWY, YUMA, Arizona 85365",
      "city": "YUMA",
      "state": "Arizona",
      "zip_code": "85365",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PROMENADE AT UPPER DUBLIN",
      "address": "217 Dryden Rd., Dresher, PA",
      "city": "Dresher",
      "state": "PA",
      "zip_code": "19025",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - FASHION DISTRICT",
      "address": "901 Market St. Unit 1155, Philadelphia, PA",
      "city": "Philadelphia",
      "state": "PA",
      "zip_code": "19107",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - WILLOW GROVE",
      "address": "2500 Moreland Rd., Suite 1103, Willow Grove, PA",
      "city": "Willow Grove",
      "state": "PA",
      "zip_code": "19090",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SHOPS @ WIREGRASS",
      "address": "28151 STATE RD 56, WESLEY CHAPEL, Florida 33543",
      "city": "WESLEY CHAPEL",
      "state": "Florida",
      "zip_code": "33543",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CHERRY HILL MALL",
      "address": "2000 RT 38 STE 1000, CHERRY HILL, New Jersey 08002",
      "city": "CHERRY HILL",
      "state": "New Jersey",
      "zip_code": "08002",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - International Plaza",
      "address": "2223 N Westshore Boulevard, Tampa, Florida 33607",
      "city": "Tampa",
      "state": "Florida",
      "zip_code": "33607",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TYRONE SQ",
      "address": "7000 TYRONE SQ, SAINT PETERSBURG, Florida 33710",
      "city": "SAINT PETERSBURG",
      "state": "Florida",
      "zip_code": "33710",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - MIDTOWN TAMPA",
      "address": "3654 Midtown Drive, Tampa, FL",
      "city": "Tampa",
      "state": "FL",
      "zip_code": "33607",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CLERMONT LANDING",
      "address": "2345 S HWY 27, CLERMONT, Florida 34711",
      "city": "CLERMONT",
      "state": "Florida",
      "zip_code": "34711",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - HYDE PARK VILLAGE",
      "address": "704 South Dakota Ave, Tampa, FL",
      "city": "Tampa",
      "state": "FL",
      "zip_code": "33606",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SEMINOLE TOWNE CTR",
      "address": "310 TOWNE CTR CIR, SANFORD, Florida 32771",
      "city": "SANFORD",
      "state": "Florida",
      "zip_code": "32771",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BRANDON",
      "address": "912 Brandon Town Center Mall, Brandon, FL",
      "city": "Brandon",
      "state": "FL",
      "zip_code": "33511",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - MERCER ON ONE",
      "address": "3371 Brunswick Pike Suite # 42, Lawrence Township, NJ",
      "city": "Lawrence Township",
      "state": "NJ",
      "zip_code": "08648",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LAKELAND SQ",
      "address": "3800 US HWY 98 N STE 200, LAKELAND, Florida 33809",
      "city": "LAKELAND",
      "state": "Florida",
      "zip_code": "33809",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ROCKAWAY TOWN SQUARE",
      "address": "305 MOUNT HOPE AVE, ROCKAWAY, New Jersey 07866",
      "city": "ROCKAWAY",
      "state": "New Jersey",
      "zip_code": "07866",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - VINELAND POINTE",
      "address": "11501 Regency Village Dr, Orlando, FL",
      "city": "Orlando",
      "state": "FL",
      "zip_code": "32821",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside THE FLORIDA MALL",
      "address": "8001 S ORANGE BLOSSOM STE 700, ORLANDO, Florida 32809",
      "city": "ORLANDO",
      "state": "Florida",
      "zip_code": "32809",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LOOP WEST",
      "address": "2001 W OSCEOLA PKWY, KISSIMMEE, Florida 34741",
      "city": "KISSIMMEE",
      "state": "Florida",
      "zip_code": "34741",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - THE CROSSLANDS SHOPPING CENTER",
      "address": "608 Centerview Blvd, Kissimmee, FL",
      "city": "Kissimmee",
      "state": "FL",
      "zip_code": "34741",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - SHORT HILLS",
      "address": "1200 Morris Turnpike, #C103, Short Hills, NJ",
      "city": "Short Hills",
      "state": "NJ",
      "zip_code": "07078",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Menlo Park (Edison)",
      "address": "449 Menlo Park Drive, Edison, New Jersey 8837",
      "city": "Edison",
      "state": "New Jersey",
      "zip_code": "08837",
      "store_type": "Nordstrom"
    },
     {
      "store_name": "Nordstrom - Menlo Park (Edison) - Duplicate Entry",
      "address": "449 Menlo Park Drive, Edison, New Jersey 8837",
      "city": "Edison",
      "state": "New Jersey",
      "zip_code": "08837",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WOODBRIDGE CTR",
      "address": "428 WOODBRIDGE CTR DR, WOODBRIDGE, New Jersey 07095",
      "city": "WOODBRIDGE",
      "state": "New Jersey",
      "zip_code": "07095",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WAYNE TOWNE CTR",
      "address": "260 WAYNE TOWNE CTR, WAYNE, New Jersey 07470",
      "city": "WAYNE",
      "state": "New Jersey",
      "zip_code": "07470",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - MARLBORO PLAZA",
      "address": "130 U.S. Highway 9, Englishtown, NJ",
      "city": "Englishtown",
      "state": "NJ",
      "zip_code": "07726",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - SARASOTA PAVILION",
      "address": "140 University Town Center Dr Suite 279, Sarasota, FL",
      "city": "Sarasota",
      "state": "FL",
      "zip_code": "34243",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside IMPERIAL VALLEY MALL",
      "address": "3351 S DOGWOOD, EL CENTRO, California 92243",
      "city": "EL CENTRO",
      "state": "California",
      "zip_code": "92243",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SPOKANE VALLEY MALL",
      "address": "14730 E INDIANA AVE, SPOKANE, Washington 99216",
      "city": "SPOKANE",
      "state": "Washington",
      "zip_code": "99216",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SPOKANE VALLEY MALL",
      "address": "14700 East Indiana Ave, Spokane Valley, WA",
      "city": "Spokane Valley",
      "state": "WA",
      "zip_code": "99216",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Garden State Plaza",
      "address": "501 Garden State Plaza, Paramus, New Jersey 7652",
      "city": "Paramus",
      "state": "New Jersey",
      "zip_code": "07652",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside OCEAN COUNTY MALL",
      "address": "1201 HOOPER AVE STE B, TOMS RIVER, New Jersey 08753",
      "city": "TOMS RIVER",
      "state": "New Jersey",
      "zip_code": "08753",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - NEWPORT CENTRE",
      "address": "30 Mall Drive West, Space #A58B, Jersey City, NJ",
      "city": "Jersey City",
      "state": "NJ",
      "zip_code": "07310",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PALM DESERT TOWN CTR",
      "address": "72900 HWY 111, PALM DESERT, California 92260",
      "city": "PALM DESERT",
      "state": "California",
      "zip_code": "92260",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Credo - Soho",
      "address": "9 Prince Street, New York, 10012",
      "city": "New York",
      "state": "NY",
      "zip_code": "10012",
      "store_type": "Credo"
    },
    {
      "store_name": "SEPHORA - SEAVIEW SQUARE",
      "address": "2325B NJ-66, Ocean Township, NJ",
      "city": "Ocean Township",
      "state": "NJ",
      "zip_code": "07712",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - UNION SQUARE",
      "address": "40 East 14th Street, New York, NY",
      "city": "New York",
      "state": "NY",
      "zip_code": "10003",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - 34TH STREET",
      "address": "112 West 34th Street, New York, NY",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - TIMES SQUARE",
      "address": "1535 Broadway, New York, NY",
      "city": "New York",
      "state": "NY",
      "zip_code": "10036",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - NYC Flagship",
      "address": "225 W 57th Street, New York, New York 10019",
      "city": "New York",
      "state": "New York",
      "zip_code": "10019",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - PALISADES CENTER",
      "address": "1000 Palisades Center Dr, # F106A, West Nyack, NY",
      "city": "West Nyack",
      "state": "NY",
      "zip_code": "10994",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - ATLANTIC TERMINAL",
      "address": "139 Flatbush Ave, Brooklyn, NY",
      "city": "Brooklyn",
      "state": "NY",
      "zip_code": "11217",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - 99TH & COLUMBUS",
      "address": "808 Columbus ave., New York, NY",
      "city": "New York",
      "state": "NY",
      "zip_code": "10025",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - POUGHKEEPSIE",
      "address": "2001 South Road, Space A208, Poughkeepsie, NY",
      "city": "Poughkeepsie",
      "state": "NY",
      "zip_code": "12601",
      "store_type": "Sephora"
    },
    {
      "store_name": "Erewhon - Venice",
      "address": "585 Venice Blvd., Venice, CA 90291",
      "city": "Venice",
      "state": "CA",
      "zip_code": "90291",
      "store_type": "Erewhon"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHTOWN MALL (Spokane)",
      "address": "4730 N DIVISION ST, SPOKANE, Washington 99207",
      "city": "SPOKANE",
      "state": "Washington",
      "zip_code": "99207",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Credo - Williamsburg",
      "address": "99 N. 6th Street, Brooklyn, New York 11249",
      "city": "Brooklyn",
      "state": "New York",
      "zip_code": "11249",
      "store_type": "Credo"
    },
    {
      "store_name": "SEPHORA - HARLEM",
      "address": "121 W 125th Street, New York, NY",
      "city": "New York",
      "state": "NY",
      "zip_code": "10027",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - 175 BROADWAY",
      "address": "175 Broadway, New York, NY",
      "city": "New York",
      "state": "NY",
      "zip_code": "10007",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - KINGS PLAZA",
      "address": "5100 Kings Plaza, Space 0151, Brooklyn, NY",
      "city": "Brooklyn",
      "state": "NY",
      "zip_code": "11234",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - JACKSON HEIGHTS",
      "address": "37-16 82nd Street Space #37-16, Jackson Heights, NY",
      "city": "Jackson Heights",
      "state": "NY",
      "zip_code": "11372",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CROSSGATES MALL",
      "address": "120 WASHINGTON AVE EXT STE 40, ALBANY, New York 12203",
      "city": "ALBANY",
      "state": "New York",
      "zip_code": "12203",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - RIDGE HILL",
      "address": "163 Market St., Yonkers, NY",
      "city": "Yonkers",
      "state": "NY",
      "zip_code": "10710",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside QUEENS CENTER",
      "address": "92-59 59TH AVE, ELMHURST, New York 11373",
      "city": "ELMHURST",
      "state": "New York",
      "zip_code": "11373",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BROOKLYN GTWY PHASE2",
      "address": "360 GATEWAY DR, BROOKLYN, New York 11239",
      "city": "BROOKLYN",
      "state": "New York",
      "zip_code": "11239",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BAY PLAZA",
      "address": "2146 Bartow Ave Suite F, Bronx, NY",
      "city": "Bronx",
      "state": "NY",
      "zip_code": "10475",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BAY PLAZA MALL",
      "address": "100 BAYCHESTER AVE, BRONX, New York 10475",
      "city": "BRONX",
      "state": "New York",
      "zip_code": "10475",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SKYVIEW CENTER",
      "address": "40-24 College Point Blvd Suite D-02B, Flushing, NY",
      "city": "Flushing",
      "state": "NY",
      "zip_code": "11354",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - VERNON HILLS (Scarsdale)",
      "address": "696 White Plains Road, Scarsdale, NY",
      "city": "Scarsdale",
      "state": "NY",
      "zip_code": "10583",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CLIFTON PARK CTR",
      "address": "22 CLIFTON COUNTRY RD STE 2, CLIFTON PARK, New York 12065",
      "city": "CLIFTON PARK",
      "state": "New York",
      "zip_code": "12065",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside AVIATION MALL",
      "address": "578 AVIATION RD STE 3, QUEENSBURY, New York 12804",
      "city": "QUEENSBURY",
      "state": "New York",
      "zip_code": "12804",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ROOSEVELT FIELD",
      "address": "630 Old Country Road #1155, Garden City, NY",
      "city": "Garden City",
      "state": "NY",
      "zip_code": "11530",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Roosevelt Field",
      "address": "630 Old Country Road, Garden City, New York 11530",
      "city": "Garden City",
      "state": "New York",
      "zip_code": "11530",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MELBOURNE SQUARE",
      "address": "1700 W NEW HAVEN AVE, MELBOURNE, Florida 32904",
      "city": "MELBOURNE",
      "state": "Florida",
      "zip_code": "32904",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL OF VICTOR VLY",
      "address": "14370 BEAR VALLEY RD, VICTORVILLE, California 92392",
      "city": "VICTORVILLE",
      "state": "California",
      "zip_code": "92392",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WALT WHITMAN",
      "address": "160 Walt Whitman Road, Space #1047A, Huntington Station, NY",
      "city": "Huntington Station",
      "state": "NY",
      "zip_code": "11746",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside REDLANDS TOWN CENTER",
      "address": "10000 ALABAMA ST, REDLANDS, California 92374",
      "city": "REDLANDS",
      "state": "California",
      "zip_code": "92374",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - DEER PARK TANGER",
      "address": "Suite 637 The Arches Circle, Deer Park, NY",
      "city": "Deer Park",
      "state": "NY",
      "zip_code": "11729",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside INLAND CENTER",
      "address": "300 INLAND CTR, SAN BERNARDINO, California 92408",
      "city": "SAN BERNARDINO",
      "state": "California",
      "zip_code": "92408",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MORENO VALLEY MALL",
      "address": "22450 TOWN CIR, MORENO VALLEY, California 92553",
      "city": "MORENO VALLEY",
      "state": "California",
      "zip_code": "92553",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CANYON SPRINGS MARKETPLACE",
      "address": "2640 Canyon Springs Parkway Suite B, Riverside, CA",
      "city": "Riverside",
      "state": "CA",
      "zip_code": "92507",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VICTORIA GARDENS ML",
      "address": "12399 S MAINSTREET, RANCHO CUCAMONGA, California 91739",
      "city": "RANCHO CUCAMONGA",
      "state": "California",
      "zip_code": "91739",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GALLERIA AT TYLER",
      "address": "3605 GALLERIA AT TYLER, RIVERSIDE, California 92503",
      "city": "RIVERSIDE",
      "state": "California",
      "zip_code": "92503",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside UNIVERSITY MALL (Burlington)",
      "address": "155 DORSET ST, SOUTH BURLINGTON, Vermont 05403",
      "city": "SOUTH BURLINGTON",
      "state": "Vermont",
      "zip_code": "05403",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside EDISON MALL",
      "address": "4125 CLEVELAND AVE STE 903, FORT MYERS, Florida 33901",
      "city": "FORT MYERS",
      "state": "Florida",
      "zip_code": "33901",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - COLONIES CROSSROADS",
      "address": "1289 East 19th Street Building #3, Upland, CA",
      "city": "Upland",
      "state": "CA",
      "zip_code": "91784",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside COLUMBIA CTR (Kennewick)",
      "address": "1321 N COLUMBIA CTR BLVD # 100, KENNEWICK, Washington 99336",
      "city": "KENNEWICK",
      "state": "Washington",
      "zip_code": "99336",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside N COUNTY FAIR MALL",
      "address": "290 E VIA RANCHO PKWY, ESCONDIDO, California 92025",
      "city": "ESCONDIDO",
      "state": "California",
      "zip_code": "92025",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MONTCLAIR PLAZA",
      "address": "5100 MONTCLAIR PLAZA LANE, MONTCLAIR, California 91763",
      "city": "MONTCLAIR",
      "state": "California",
      "zip_code": "91763",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - CARMEL MOUNTAIN PLAZA",
      "address": "11740 Carmel Mountain Plaza, San Diego, CA",
      "city": "San Diego",
      "state": "CA",
      "zip_code": "92128",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MEADOWOOD S C",
      "address": "5200 MEADOWOOD MALL CIR, RENO, Nevada 89502",
      "city": "RENO",
      "state": "Nevada",
      "zip_code": "89502",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PLAZA CAMINO REAL",
      "address": "2555 EL CAMINO REAL, CARLSBAD, California 92008",
      "city": "CARLSBAD",
      "state": "California",
      "zip_code": "92008",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHGATE MALL (Carson City)",
      "address": "3939 S CARSON ST, CARSON CITY, Nevada 89701",
      "city": "CARSON CITY",
      "state": "Nevada",
      "zip_code": "89701",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ANTELOPE VALLEY MALL",
      "address": "1131 W RANCHO VISTA BLVD, PALMDALE, California 93551",
      "city": "PALMDALE",
      "state": "California",
      "zip_code": "93551",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - FOOTHILL RANCH TOWNE CENTER",
      "address": "26736 Portola Parkway Suite 6-C, Foothill Ranch, CA",
      "city": "Foothill Ranch",
      "state": "CA",
      "zip_code": "92610",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WEST COVINA FASH PLZ",
      "address": "1203 PLAZA DR, WEST COVINA, California 91790",
      "city": "WEST COVINA",
      "state": "California",
      "zip_code": "91790",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PLAZA WEST COVINA",
      "address": "1430 Plaza Drive, West Covina, CA.",
      "city": "West Covina",
      "state": "CA",
      "zip_code": "91790",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - FASHION VALLEY",
      "address": "7007 Friars Road, Space 314, San Diego, CA",
      "city": "San Diego",
      "state": "CA",
      "zip_code": "92108",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Fashion Valley Center",
      "address": "6997 Friars Road, San Diego, California 92108",
      "city": "San Diego",
      "state": "California",
      "zip_code": "92108",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FASHION VALLEY MALL",
      "address": "6987 FRIARS RD, SAN DIEGO, California 92108",
      "city": "SAN DIEGO",
      "state": "California",
      "zip_code": "92108",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CHULA VISTA S C",
      "address": "591 BROADWAY, CHULA VISTA, California 91910",
      "city": "CHULA VISTA",
      "state": "California",
      "zip_code": "91910",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - LIBERTY STATION",
      "address": "2445 Truxtun Road, Suite 101, San Diego, Ca",
      "city": "San Diego",
      "state": "CA",
      "zip_code": "92106",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WESTFLD SANTA ANITA",
      "address": "400 S BALDWIN AVE, ARCADIA, California 91007",
      "city": "ARCADIA",
      "state": "California",
      "zip_code": "91007",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SANTA ANITA",
      "address": "400 S. Baldwin Ave Suite 432-L, Arcadia, CA",
      "city": "Arcadia",
      "state": "CA",
      "zip_code": "91007",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SANTA ANA MAINPLACE",
      "address": "2890 N MAIN ST, SANTA ANA, California 92705",
      "city": "SANTA ANA",
      "state": "California",
      "zip_code": "92705",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SOUTH COAST PLAZA",
      "address": "3333 Bristol Street, Suite 1808, Costa Mesa, CA",
      "city": "Costa Mesa",
      "state": "CA",
      "zip_code": "92626",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MONTEBELLO MALL",
      "address": "1600 TOWN CENTER DR, MONTEBELLO, California 90640",
      "city": "MONTEBELLO",
      "state": "California",
      "zip_code": "90640",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside COASTLAND S C",
      "address": "2076 9TH ST N, NAPLES, Florida 34102",
      "city": "NAPLES",
      "state": "Florida",
      "zip_code": "34102",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ALHAMBRA PLACE",
      "address": "2 South Garfield Avenue, Suite 120, Alhambra, CA",
      "city": "Alhambra",
      "state": "CA",
      "zip_code": "91801",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside TREASURE COAST SQ",
      "address": "3382 NW FEDERAL HWY, JENSEN BEACH, Florida 34957",
      "city": "JENSEN BEACH",
      "state": "Florida",
      "zip_code": "34957",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Los Cerritos Center",
      "address": "300 Los Cerritos Center, Cerritos, California 90703",
      "city": "Cerritos",
      "state": "California",
      "zip_code": "90703",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - DOWNEY LANDING",
      "address": "12110 Lakewood Blvd, Downey, CA",
      "city": "Downey",
      "state": "CA",
      "zip_code": "90242",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - LOS CERRITOS",
      "address": "161 Los Cerritos Center, Cerritos, CA",
      "city": "Cerritos",
      "state": "CA",
      "zip_code": "90703",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GLENDALE GALLERIA",
      "address": "1169 GLENDALE GALLERIA, GLENDALE, California 91210",
      "city": "GLENDALE",
      "state": "California",
      "zip_code": "91210",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - AMERICANA GLENDALE",
      "address": "230 Americana Way, Glendale, CA",
      "city": "Glendale",
      "state": "CA",
      "zip_code": "91210",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - BURBANK EMPIRE CENTER",
      "address": "1403 N. Victory Pl,, Burbank, CA",
      "city": "Burbank",
      "state": "CA",
      "zip_code": "91502",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside LAKEWOOD CTR MALL",
      "address": "67 LAKEWOOD CTR MALL, LAKEWOOD, California 90712",
      "city": "LAKEWOOD",
      "state": "California",
      "zip_code": "90712",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VISALIA MALL",
      "address": "2115 S MOONEY BLVD, VISALIA, California 93277",
      "city": "VISALIA",
      "state": "California",
      "zip_code": "93277",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Erewhon - Silver Lake",
      "address": "4121 Santa Monica Blvd, Los Angeles, CA 90029",
      "city": "Los Angeles",
      "state": "CA",
      "zip_code": "90029",
      "store_type": "Erewhon"
    },
    {
      "store_name": "SEPHORA - FIG AT 7TH",
      "address": "735 S. Figueroa St Suite 133, Los Angeles, CA",
      "city": "Los Angeles",
      "state": "CA",
      "zip_code": "90017",
      "store_type": "Sephora"
    },
    {
      "store_name": "Thirteen Lune Flagship",
      "address": "120 North Larchmont Boulevard, Los Angeles, California 90004",
      "city": "Los Angeles",
      "state": "California",
      "zip_code": "90004",
      "store_type": "Thirteen Lune Flagship"
    },
    {
      "store_name": "SEPHORA - OVATION HOLLYWOOD",
      "address": "6801 Hollywood Blvd. Space B2-245, Hollywood, CA",
      "city": "Hollywood",
      "state": "CA",
      "zip_code": "90028",
      "store_type": "Sephora"
    },
    {
      "store_name": "Erewhon - Grove",
      "address": "7660 Beverly Blvd, Los Angeles, CA 90036",
      "city": "Los Angeles",
      "state": "CA",
      "zip_code": "90036",
      "store_type": "Erewhon"
    },
    {
      "store_name": "SEPHORA - THE GROVE",
      "address": "189 The Grove Drive, Suite J1A, Los Angeles, CA",
      "city": "Los Angeles",
      "state": "CA",
      "zip_code": "90036",
      "store_type": "Sephora"
    },
    {
      "store_name": "Credo - W 3rd",
      "address": "8327 W. 3RD ST, Los Angeles, California 90048",
      "city": "Los Angeles",
      "state": "California",
      "zip_code": "90048",
      "store_type": "Credo"
    },
    {
      "store_name": "Erewhon - Studio City",
      "address": "12833 Ventura Blvd., Studio City, CA 91604",
      "city": "Studio City",
      "state": "CA",
      "zip_code": "91604",
      "store_type": "Erewhon"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHBAY PAV @CARSON",
      "address": "20700 AVALON BLVD, CARSON, California 90746",
      "city": "CARSON",
      "state": "California",
      "zip_code": "90746",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Erewhon - Beverly Hills",
      "address": "339 N Beverly Dr., Beverly Hills, CA 90210",
      "city": "Beverly Hills",
      "state": "CA",
      "zip_code": "90210",
      "store_type": "Erewhon"
    },
    {
      "store_name": "Erewhon - Culver City",
      "address": "9300 Culver Blvd., Culver City, CA 90232",
      "city": "Culver City",
      "state": "CA",
      "zip_code": "90232",
      "store_type": "Erewhon"
    },
    {
      "store_name": "Nordstrom - Century City",
      "address": "10250 Santa Monica Boulevard Dept 3, Los Angeles, California 90067",
      "city": "Los Angeles",
      "state": "California",
      "zip_code": "90067",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FOX HILLS MALL",
      "address": "6000 S HANNUM AVE, CULVER CITY, California 90230",
      "city": "CULVER CITY",
      "state": "California",
      "zip_code": "90230",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHRIDGE FASH CTR",
      "address": "9301 TAMPA AVE, NORTHRIDGE, California 91324",
      "city": "NORTHRIDGE",
      "state": "California",
      "zip_code": "91324",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Del Amo Fashion Center",
      "address": "21500 Hawthorne Boulevard, Torrance, California 90503",
      "city": "Torrance",
      "state": "California",
      "zip_code": "90503",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DEL AMO CENTER",
      "address": "21840 S HAWTHORNE BLVD, TORRANCE, California 90503",
      "city": "TORRANCE",
      "state": "California",
      "zip_code": "90503",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - THE SHOPS AT RIVER WALK",
      "address": "10730 Stockdale Hwy, Suite 100, Bakersfield, CA",
      "city": "Bakersfield",
      "state": "CA",
      "zip_code": "93311",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - ROLLING HILLS PLAZA",
      "address": "2665 Pacific Coast Highway, Torrance, CA",
      "city": "Torrance",
      "state": "CA",
      "zip_code": "90505",
      "store_type": "Sephora"
    },
    {
      "store_name": "Erewhon - Santa Monica",
      "address": "2800 Wilshire Blvd., Santa Monica, CA 90403",
      "city": "Santa Monica",
      "state": "CA",
      "zip_code": "90403",
      "store_type": "Erewhon"
    },
    {
      "store_name": "SEPHORA - SANTA MONICA",
      "address": "1244 Third Street, Santa Monica, CA",
      "city": "Santa Monica",
      "state": "CA",
      "zip_code": "90401",
      "store_type": "Sephora"
    },
    {
      "store_name": "Erewhon - Palisades",
      "address": "15285 W. Sunset Blvd, Pacific Palisades, CA 90272",
      "city": "Pacific Palisades",
      "state": "CA",
      "zip_code": "90272",
      "store_type": "Erewhon"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FRESNO FASHION FAIR",
      "address": "555 E SHAW AVE, FRESNO, California 93710",
      "city": "FRESNO",
      "state": "California",
      "zip_code": "93710",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Erewhon - Calabasas",
      "address": "26767 Agoura Rd, Calabasas, CA 91302",
      "city": "Calabasas",
      "state": "CA",
      "zip_code": "91302",
      "store_type": "Erewhon"
    },
    {
      "store_name": "SEPHORA - THE GARDENS",
      "address": "3101 PGA Blvd., #229, Palm Beach Gardens, FL",
      "city": "Palm Beach Gardens",
      "state": "FL",
      "zip_code": "33410",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL @ WHITNEY FIELD",
      "address": "100 COMMERCIAL RD UNIT 180, LEOMINSTER, Massachusetts 01453",
      "city": "LEOMINSTER",
      "state": "Massachusetts",
      "zip_code": "01453",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WELLINGTON GREEN S C",
      "address": "10308 W FOREST HILL BLVD, WELLINGTON, Florida 33414",
      "city": "WELLINGTON",
      "state": "Florida",
      "zip_code": "33414",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WEST PALM BEACH",
      "address": "1781 Palm Beach Lakes Blvd., ST # W218, West Palm Beach, FL",
      "city": "West Palm Beach",
      "state": "FL",
      "zip_code": "33401",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WASHINGTON PLAZA (Union Gap)",
      "address": "1500 E WASHINGTON AVE, UNION GAP, Washington 98903",
      "city": "UNION GAP",
      "state": "Washington",
      "zip_code": "98903",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOLOMON POND MALL",
      "address": "573 DONALD LYNCH BLVD, MARLBOROUGH, Massachusetts 01752",
      "city": "MARLBOROUGH",
      "state": "Massachusetts",
      "zip_code": "01752",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY NORTH S C",
      "address": "1300 N MILLER ST, WENATCHEE, Washington 98801",
      "city": "WENATCHEE",
      "state": "Washington",
      "zip_code": "98801",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BOYNTON BEACH MALL",
      "address": "801 N CONGRESS AVE, BOYNTON BEACH, Florida 33426",
      "city": "BOYNTON BEACH",
      "state": "Florida",
      "zip_code": "33426",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - MARKET AND MAIN",
      "address": "6 Main Street Suite #1, Bedford, NH",
      "city": "Bedford",
      "state": "NH",
      "zip_code": "03110",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PHEASANT LANE MALL",
      "address": "310 DANIEL WEBSTER HWY STE 103, NASHUA, New Hampshire 03060",
      "city": "NASHUA",
      "state": "New Hampshire",
      "zip_code": "03060",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WARWICK MALL",
      "address": "400 BALD HILL RD, WARWICK, Rhode Island 02886",
      "city": "WARWICK",
      "state": "Rhode Island",
      "zip_code": "02886",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MALL OF NEW HAMPSHIR",
      "address": "1500 S WILLOW ST, MANCHESTER, New Hampshire 03103",
      "city": "MANCHESTER",
      "state": "New Hampshire",
      "zip_code": "03103",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MERCED MALL",
      "address": "600 MERCED MALL, MERCED, California 95348",
      "city": "MERCED",
      "state": "California",
      "zip_code": "95348",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside EMERALD SQ MALL",
      "address": "1019 S WASHINGTON ST, NORTH ATTLEBORO, Massachusetts 02760",
      "city": "NORTH ATTLEBORO",
      "state": "Massachusetts",
      "zip_code": "02760",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CORAL SQUARE MALL",
      "address": "9303 W ATLANTIC BLVD, CORAL SPRINGS, Florida 33071",
      "city": "CORAL SPRINGS",
      "state": "Florida",
      "zip_code": "33071",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SAWGRASS MILLS",
      "address": "12801 W. Sunrise Blvd. Room #661, Sunrise, FL",
      "city": "Sunrise",
      "state": "FL",
      "zip_code": "33323",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BROWARD MALL",
      "address": "8000 W BROWARD BLVD STE 900, PLANTATION, Florida 33388",
      "city": "PLANTATION",
      "state": "Florida",
      "zip_code": "33388",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - DAVIE",
      "address": "1809 S. University Drive, Davie, FL",
      "city": "Davie",
      "state": "FL",
      "zip_code": "33324",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - FOLSOM",
      "address": "280 Palladio Pkwy., Space #901, Folsom, CA",
      "city": "Folsom",
      "state": "CA",
      "zip_code": "95630",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - PEMBROKE GARDENS",
      "address": "516 SW 145th Terrace, Pembroke Pines, FL",
      "city": "Pembroke Pines",
      "state": "FL",
      "zip_code": "33027",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PEMBROKE LAKES MALL",
      "address": "11725 PINES BLVD, PEMBROKE PINES, Florida 33026",
      "city": "PEMBROKE PINES",
      "state": "Florida",
      "zip_code": "33026",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PRUDENTIAL CENTER",
      "address": "800 Bolyston Street, Space 157, Boston, MA",
      "city": "Boston",
      "state": "MA",
      "zip_code": "02199",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - ASSEMBLY ROW",
      "address": "449 Assembly Row Space #606, Somerville, MA",
      "city": "Somerville",
      "state": "MA",
      "zip_code": "02145",
      "store_type": "Sephora"
    },
    {
      "store_name": "Credo - Newbury",
      "address": "177 Newbury Street, Boston, Massachusetts 02116",
      "city": "Boston",
      "state": "Massachusetts",
      "zip_code": "02116",
      "store_type": "Credo"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside GALLERIA @ ROSEVILLE",
      "address": "1125 GALLERIA BLVD, ROSEVILLE, California 95678",
      "city": "ROSEVILLE",
      "state": "California",
      "zip_code": "95678",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - THE FOUNTAINS",
      "address": "1013 Galleria Boulevard, Suite 140, Roseville, CA",
      "city": "Roseville",
      "state": "CA",
      "zip_code": "95678",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SUNRISE MALL CA",
      "address": "6100 SUNRISE BLVD, CITRUS HTS, California 95610",
      "city": "CITRUS HTS",
      "state": "California",
      "zip_code": "95610",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WESTLAND MALL (Miami)",
      "address": "1675 W 49th St Space #1372, Hialeah, FL",
      "city": "Hialeah",
      "state": "FL",
      "zip_code": "33012",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DARTMOUTH MALL",
      "address": "120 N DARTMOUTH MALL, NORTH DARTMOUTH, Massachusetts 02747",
      "city": "NORTH DARTMOUTH",
      "state": "Massachusetts",
      "zip_code": "02747",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VINTAGE FAIRE MALL",
      "address": "3401 DALE RD, MODESTO, California 95356",
      "city": "MODESTO",
      "state": "California",
      "zip_code": "95356",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "Nordstrom - Aventura",
      "address": "19507 Biscayne Boulevard, Aventura, Florida 33180",
      "city": "Aventura",
      "state": "Florida",
      "zip_code": "33180",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside MIAMI INTL MALL",
      "address": "1603 NW 107TH AVE, MIAMI, Florida 33172",
      "city": "MIAMI",
      "state": "Florida",
      "zip_code": "33172",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ARDEN FAIR MALL",
      "address": "1695 ARDEN WAY, SACRAMENTO, California 95815",
      "city": "SACRAMENTO",
      "state": "California",
      "zip_code": "95815",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside FOX RUN MALL",
      "address": "50 FOX RUN RD STE 35, NEWINGTON, New Hampshire 03801",
      "city": "NEWINGTON",
      "state": "New Hampshire",
      "zip_code": "03801",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside DADELAND MALL",
      "address": "7201 N KENDALL DR, MIAMI, Florida 33156",
      "city": "MIAMI",
      "state": "Florida",
      "zip_code": "33156",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PROM SHOP@ORCHD VLLY",
      "address": "1060 PERIMETER DR, MANTECA, California 95337",
      "city": "MANTECA",
      "state": "California",
      "zip_code": "95337",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside WEBERSTOWN SHPG CNTR",
      "address": "4915 CLAREMONT AVE, STOCKTON, California 95207",
      "city": "STOCKTON",
      "state": "California",
      "zip_code": "95207",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - LINCOLN CENTER (Stockton)",
      "address": "6521 Pacific Ave, Stockton, CA",
      "city": "Stockton",
      "state": "CA",
      "zip_code": "95207",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHLAND MALL (Miami)",
      "address": "20505 S DIXIE HWY, MIAMI, Florida 33189",
      "city": "MIAMI",
      "state": "Florida",
      "zip_code": "33189",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ORCHARD @SLATTEN RCH",
      "address": "4951 SLATTEN RANCH RD, ANTIOCH, California 94531",
      "city": "ANTIOCH",
      "state": "California",
      "zip_code": "94531",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - SLATTEN RANCH",
      "address": "5749 Lone Tree Way Suite B, Antioch, CA",
      "city": "Antioch",
      "state": "CA",
      "zip_code": "94509",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - PLAZA 580",
      "address": "4342 Las Positas Rd, Livermore, CA",
      "city": "Livermore",
      "state": "CA",
      "zip_code": "94551",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside AUBURN MALL",
      "address": "550 CENTER ST, AUBURN, Maine 04210",
      "city": "AUBURN",
      "state": "Maine",
      "zip_code": "04210",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - PERSIMMON PLACE",
      "address": "5186 Dublin Blvd, Dublin, CA",
      "city": "Dublin",
      "state": "CA",
      "zip_code": "94568",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside EASTRIDGE SHOP CTR",
      "address": "2230 EASTRIDGE LOOP, SAN JOSE, California 95122",
      "city": "SAN JOSE",
      "state": "California",
      "zip_code": "95122",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - THE VERANDA",
      "address": "2075 Diamond Blvd - Store #H-125, Concord, CA",
      "city": "Concord",
      "state": "CA",
      "zip_code": "94520",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - THE GREAT MALL",
      "address": "250 Great Mall Drive, Milpitas, CA",
      "city": "Milpitas",
      "state": "CA",
      "zip_code": "95035",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside NORTHRIDGE MALL (Salinas)",
      "address": "100 NORTHRIDGE MALL, SALINAS, California 93906",
      "city": "SALINAS",
      "state": "California",
      "zip_code": "93906",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CLACKAMAS TOWN CTR",
      "address": "12300 SE 82ND AVE, HAPPY VALLEY, Oregon 97086",
      "city": "HAPPY VALLEY",
      "state": "Oregon",
      "zip_code": "97086",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - ISSAQUAH COMMONS",
      "address": "775 NW Gilman Blvd, Ste C13, Issaquah, WA",
      "city": "Issaquah",
      "state": "WA",
      "zip_code": "98027",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VANCOUVER MALL (Washington)",
      "address": "8900 NE VANCOUVER MALL DR, VANCOUVER, Washington 98662",
      "city": "VANCOUVER",
      "state": "Washington",
      "zip_code": "98662",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - VANCOUVER MALL (Washington)",
      "address": "8800 NE Vancouver Mall Drive, Suite 130, Vancouver, WA",
      "city": "Vancouver",
      "state": "WA",
      "zip_code": "98665",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - VALLEY FAIR (San Jose)",
      "address": "2855 Stevens Creek Blvd. Suite 1067, Santa Clara, CA",
      "city": "Santa Clara",
      "state": "CA",
      "zip_code": "95050",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ROGUE VALLEY MALL",
      "address": "1500 N RIVERSIDE AVE, MEDFORD, Oregon 97501",
      "city": "MEDFORD",
      "state": "Oregon",
      "zip_code": "97501",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHLAND MALL (Hayward)",
      "address": "340 SOUTHLAND MALL, HAYWARD, California 94545",
      "city": "HAYWARD",
      "state": "California",
      "zip_code": "94545",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - WESTGATE (San Jose)",
      "address": "1546 Saratoga Ave, Suite P503, San Jose, CA",
      "city": "San Jose",
      "state": "CA",
      "zip_code": "95129",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTH HILL MALL",
      "address": "3700 S MERIDIAN ST, PUYALLUP, Washington 98373",
      "city": "PUYALLUP",
      "state": "Washington",
      "zip_code": "98373",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside SOUTHCENTER MALL",
      "address": "1249 SOUTHCENTER MALL, TUKWILA, Washington 98188",
      "city": "TUKWILA",
      "state": "Washington",
      "zip_code": "98188",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - EMERYVILLE",
      "address": "5626 Bay Street, Emeryville, CA",
      "city": "Emeryville",
      "state": "CA",
      "zip_code": "94608",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Downtown Seattle",
      "address": "500 Pine Street, Seattle, Washington 98101",
      "city": "Seattle",
      "state": "Washington",
      "zip_code": "98101",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - OAKWAY CENTER",
      "address": "135 Oakway Road, Eugene, OR",
      "city": "Eugene",
      "state": "OR",
      "zip_code": "97401",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - Tacoma Mall",
      "address": "4502 S Steele Street, Suite 800, Tacoma, Washington 98409",
      "city": "Tacoma",
      "state": "Washington",
      "zip_code": "98409",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "Nordstrom - Alderwood",
      "address": "3200 184th Street Southwest, Lynnwood, Washington 98037",
      "city": "Lynnwood",
      "state": "Washington",
      "zip_code": "98037",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside VALLEY RIVER CTR",
      "address": "300 VALLEY RIVER CTR, EUGENE, Oregon 97401",
      "city": "EUGENE",
      "state": "Oregon",
      "zip_code": "97401",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside ALDERWOOD MALL",
      "address": "18601 33RD AVE W, LYNNWOOD, Washington 98037",
      "city": "LYNNWOOD",
      "state": "Washington",
      "zip_code": "98037",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "SEPHORA - BALLARD BLOCKS",
      "address": "1401 NW 46th Street Suite 130 & 140, Seattle, WA",
      "city": "Seattle",
      "state": "WA",
      "zip_code": "98107",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - HILLSDALE (San Mateo)",
      "address": "60 - 31st Ave, Space #1016, San Mateo, CA",
      "city": "San Mateo",
      "state": "CA",
      "zip_code": "94403",
      "store_type": "Sephora"
    },
    {
      "store_name": "Nordstrom - San Francisco Centre",
      "address": "865 Market Street, San Francisco, California 94103",
      "city": "San Francisco",
      "state": "California",
      "zip_code": "94103",
      "store_type": "Nordstrom"
    },
    {
      "store_name": "SEPHORA - POWELL STREET",
      "address": "33 Powell Street, San Francisco, CA",
      "city": "San Francisco",
      "state": "CA",
      "zip_code": "94102",
      "store_type": "Sephora"
    },
    {
      "store_name": "Credo - Hayes Valley",
      "address": "552 Hayes Street, San Francisc, California 94102",
      "city": "San Francisco",
      "state": "California",
      "zip_code": "94102",
      "store_type": "Credo"
    },
    {
      "store_name": "Credo - Fillmore",
      "address": "2136 FILLMORE STREET, San Francisco, California 94115",
      "city": "San Francisco",
      "state": "California",
      "zip_code": "94115",
      "store_type": "Credo"
    },
    {
      "store_name": "SEPHORA - NOVATO",
      "address": "208 Vintage Oaks, K-3, Novato, CA",
      "city": "Novato",
      "state": "CA",
      "zip_code": "94945",
      "store_type": "Sephora"
    },
    {
      "store_name": "SEPHORA - DALY CITY",
      "address": "153-D Serramonte Center, Daly City, CA",
      "city": "Daly City",
      "state": "CA",
      "zip_code": "94015",
      "store_type": "Sephora"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside CODDINGTOWN CTR",
      "address": "800 CODDINGTOWN CTR, SANTA ROSA, California 95401",
      "city": "SANTA ROSA",
      "state": "California",
      "zip_code": "95401",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside PEAR TREE CENTER",
      "address": "205 N ORCHARD AVE, UKIAH, California 95482",
      "city": "UKIAH",
      "state": "California",
      "zip_code": "95482",
      "store_type": "Thirteen Lune at JCP"
    },
    {
      "store_name": "THIRTEEN LUNE at JCP inside BANGOR MALL",
      "address": "639 STILLWATER AVE, BANGOR, Maine 04401",
      "city": "BANGOR",
      "state": "Maine",
      "zip_code": "04401",
      "store_type": "Thirteen Lune at JCP"
    }
  ]
  
const systemPromt = {
    "title": "sienna-naturals-prompt",
    "description": "",
    "note": "",
    "parameters": {
        "temperature": 1,
        "tokenLimits": 8192,
        "topP": 0.95,
        "groundingPromptConfig": {
            "disabled": true,
            "groundingConfig": {
                "sources": [
                    {
                        "type": "WEB"
                    }
                ]
            }
        },
        "responseMimeType": "application/json",
        "responseSchema": {
            "type": "OBJECT",
            "properties": {}
        },
        "responseModalities": [
            "TEXT"
        ],
        "voiceName": ""
    },
    "systemInstruction": {
        "parts": [{
            "text": `
                You are a virtual assistant for Sienna Naturals, and trained to handle product inquiries and haircare questions. Your goal is to provide friendly, professional, and conversational support while aligning with Sienna Naturals' brand voice and haircare expertise.
                 Ask for the User's Name (If Not Provided):
                If the user's name is not available in their profile, ask for their name in an elegant and friendly way only once. For example:

                "I’d love to address you by name! What should I call you?"

                "It’s great to meet you! May I know your name so I can personalize your experience?"

                Implementation Rules:

                Ask Only Once: If the user doesn’t provide their name after the first prompt, do not ask again in the same conversation.

                Integrate Naturally: Embed the name request into the response without disrupting the flow. For example:

                After answering their question: "By the way, I’d love to address you by name! What should I call you?"

                At the start of the conversation: "It’s great to meet you! May I know your name so I can personalize your experience?"

                Avoid Insistence: If the user ignores the request or doesn’t provide their name, continue the conversation without further prompts.
                **If user asks if they can send an image of their hair reccommend Myavana HairAI™ Instant Hair Analysis, but let them send their selfie or image of their hair for basic analysis of their hairtype, etc.


                Generate a suitable response with kommunicate rich message format always. All responses should be json, including text as shown. Send appropriate images as much as possible. Embedd the youtube videos as much as possible. you can also generate multiple response types Here are the ONLY templates to use:

                Product card: [ {
                    "messageType": "html",
                    "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Your text response here, styled according to Sienna Naturals brand guidelines.</p></body></html>",
                    "platform": "kommunicate",
                    "metadata": {
                    "contentType": "300",
                    "templateId": "10",
                    "payload": [{
                        "title": "product title",
                        "subtitle": "product excerpt | Price: product price",
                        "header": {
                        "imgSrc": "product image url or ${DEFAULT_IMAGES.primary}"
                        },
                        "description": "product description",
                        "buttons": [{
                        "name": "Buy Now",
                        "action": {
                            "type": "link",
                            "payload": {
                            "url": "product url"
                            }
                        },
                        "replyMetadata": {
                          "KM_CHAT_CONTEXT": { // select appropriate keys if any from the following:
                            "product_url_clicked": "true",
                            "product_find_out_more": "true",
                            "product_name": "product name"
                          }
                        }
                        }]
                    }]
                    }
                }
                ]

                Image carousel: [ {
                    "messageType": "html",
                    "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Your text response here, styled according to Sienna Naturals brand guidelines.</p></body></html>",
                    "platform": "kommunicate",
                    "metadata": {
                    "templateId": "9",
                    "contentType": "300",
                    "payload": [{
                        "caption": "image caption",
                        "url": "image url or ${DEFAULT_IMAGES.primary}"
                    }]
                    }
                }
                ]

                Button template: [ {
                    "messageType": "html",
                    "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Your text response here, styled according to Sienna Naturals brand guidelines.</p></body></html>",
                    "platform": "kommunicate",
                    "metadata": {
                    "contentType": "300",
                    "templateId": "3",
                    "payload": [{
                        "type": "link",
                        "url": "button url",
                        "name": "button name",
                        // only if product
                        "replyMetadata": {
                          "KM_CHAT_CONTEXT": { // select appropriate keys if any from the following:
                            "product_url_clicked": "true",
                            "product_find_out_more": "true",
                            "product_name": "product name"
                          }
                        }
                        "replyText": "if product: product_title url clicked/user want to know more else: empty string",
                    }]
                    }
                }
                ]

                Suggested replies: [ {
                    "messageType": "html",
                    "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Your text response here, styled according to Sienna Naturals brand guidelines.</p></body></html>",
                    "platform": "kommunicate",
                    "metadata": {
                    "contentType": "300",
                    "templateId": "6",
                    "payload": [{
                        "title": "suggested reply title",
                        "message": "suggested reply message",
                        // only if product
                        "replyMetadata": {
                          "KM_CHAT_CONTEXT": { // select appropriate keys if any from the following:
                            "product_url_clicked": "true",
                            "product_find_out_more": "true",
                            "product_name": "product name"
                          }
                        }
                        "replyText": "if product: product_title url clicked/user want to know more else: empty string",
                    }]
                    }
                }
                ]
                Video template: [ {
                    "messageType": "html",
                    "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Your text response here, styled according to Sienna Naturals brand guidelines.</p></body></html>",
                    "platform": "kommunicate",
                    "metadata": {
                    "contentType": "300",
                    "templateId": "14",
                    "payload": [
                        {
                        "source": "youtube",
                        "url": "https://www.youtube.com/embed/video_id",
                        "caption": "the video title"
                        }
                    ]
                    }
                }]

                Text response: [ {
                    "messageType": "html",
                    "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Your text response here, styled according to Sienna Naturals brand guidelines.</p></body></html>",
                    "platform": "kommunicate"
                }]

               

                Brand Story and Values:
                Hannah Diop and Issa Rae founded Sienna Naturals in 2012 after struggling to find effective, clean haircare for textured hair. After years of research and development, Hannah created custom formulas powered by high-quality naturals and Rooted Technology™. Issa Rae later joined as co-founder. The brand focuses on clean, dermatologist-tested products that work for all textured hair types - whether coily, curly, straightened, color-treated, braided, in locs, or with wigs or weaves.

                Our Mission:
                - Revolutionize the industry with clean formulations
                - Prioritize health and well-being of our community
                - Address historical oversight of textured hair consumers' health concerns
                - Provide safe, effective products through dermatologist testing and clean innovation

                Key Features:
                - First ever dermatologist tested and approved haircare line for textured hair: DERM-TESTED AND APPROVED
                - Products tested on 50+ human subjects
                - Board Certified Dermatologists and Registered Nurses oversee clinical trials
                - Proprietary Rooted Technology™ specifically for textured hair
                - Clean, plant-based formulations
                - 8 out of 10 customers see a difference after first wash

                Customer Programs:
                1. Sienna Rewards:
                - Points for purchases (1 point per dollar)
                - Account creation bonus (35 points)
                - Birthday rewards (100 points)
                - Social media follows (10 points each)
                - Photo submissions (25 points)
                - Reward tiers: Belong, Believe ($250), Become ($475)

                2. Subscription Program:
                - Save up to 25% for 2025 with code NY25
                - Free shipping on recurring orders
                - Flexible cancellation and updates

                Professional Program:
                - Safe for stylist health and gentle on hands
                - Wholesale opportunities available
                - Professional training and support

                Customer Service:
                - 30-day return policy
                - Shipping costs non-refundable
                - Contact: customerservice@siennanaturals.com
                - Sample sets are final sale

                Additional Tone Information from Sienna website:
                The Realist Brand
                We know natural hair is a journey. We're not here to be negative, we just believe in saying the silent struggle out loud and shouting the celebration louder than anyone else.
                THE REALEST PRODUCTS
                We prioritize clean ingredients and expert-developed products over everything, because you shouldn't have to sacrifice safety for style

                -Our modern hair care gives you the freedom to achieve your hair goals and best styles with hair health, body wellness, and planet-friendly formulas.

                Based on this information, attempt to provide a helpful and accurate response to the customer that is:
                - Friendly and professional
                - Aligned with Sienna Naturals' brand voice
                - As SHORT as possible, conversational and engaging
                - Ends naturally, without forcing a call-to-action unless appropriate


                Guidelines for Image Fallback:
                - If an image URL is unavailable, use the following default image in this priority order:
                    1. https://www.siennanaturals.com/cdn/shop/files/banner1.jpg
                    2. https://www.siennanaturals.com/cdn/shop/files/hannah_issa_duo_ed709ef3-f5f4-424d-9372-e24c03be8f7c_370x230@2x.png
                    3. https://www.siennanaturals.com/cdn/shop/files/navigation_customertestimonials_370x230@2x.jpg
                    4. https://www.siennanaturals.com/cdn/shop/files/Mobile_48_370x230@2x.png

                Important Rules:
                - Never generate links not provided in the data
                - Never provide false information or speculation.
                - Use default images when product images unavailable
                - Keep responses concise but helpful
                - Focus on hair health and clean beauty
                - Reference dermatologist testing when relevant
                - Emphasize clean, natural ingredients
                - Highlight the brand's expertise in textured hair
                -Do not offer users to take the hair quiz. You are not to administer hair quiz at this time. Very important!

                Available Links:
                Professional: https://www.siennanaturals.com/pages/professionals
                Affiliate: https://af.uppromote.com/snconstruct/register
                Contact: https://www.siennanaturals.com/pages/contact-us
                Returns: https://www.siennanaturals.com/pages/returns
                Rewards: https://www.siennanaturals.com/pages/rewards
                About: https://www.siennanaturals.com/pages/sienna-about-us
                Terms: https://www.siennanaturals.com/policies/terms-of-service
                FAQ: https://www.siennanaturals.com/pages/sienna-faqs
                Apply to be a Wholesale/Professional: https://survey.typeform.com/to/iujLKCW4?typeform-source=www.siennanaturals.com
                Join our Customer Affiliate Program: https://af.uppromote.com/snconstruct/register
                Wholesale/Professionals Login: https://www.siennanaturals.com/pages/customer-login

                Social Media:
                Instagram: https://www.instagram.com/siennanaturals/?hl=en
                Facebook: https://www.facebook.com/SiennaNaturals
                Twitter: https://twitter.com/SiennaNaturals
                YouTube: https://www.youtube.com/channel/UCJo8mHb0dEVQd7tab1Q3Sng

                Reasons to Believe:

Texture Care Innovation with Clean Credibility:

Plant-Based

Dermatologist-Tested

Ingredient Integrity

Hannah's Origin Story

Haircare as Healthcare - Positions haircare beyond aesthetics, emphasizing health and wellness.

Results-Driven Rituals that bring wellness into Wash Day:

Wash Day Rituals - Implies a holistic and enjoyable hair care routine.

Haircare as Self-Care

Luxurious Formulas

Feeling the Sienna Difference - Focus on tangible results and user experience.

Styling Solutions that empower Expression & Experimentation:

Rooted in Real - Connects back to the campaign and authentic approach.

Salon-Tested - Professional quality and validation.

Powerful Customer Claims - Social proof and effectiveness.

Issa Rae as Muse and Co-founder - Brand identity and aspirational element.
The Problem:

Problem Statement: "Over 75% of beauty products marketed to people with textured hair contain toxic ingredients." - Highlights the market need and brand's purpose.

Toxic Ingredient Examples (Non-straight hair products):

DMDM hydantoin: nose and throat cancer

Fragrance: toxins like BHA and phthalates

Polyethylene glycols (PEGs): linked to cancer

Breast Cancer Link: "90% of breast cancer cases are linked to chemicals in our environment, with the chemicals in personal care products causing a high risk of breast cancer." - Reinforces the health concern and brand mission.

Hair Discrimination (CROWN Act): Connects hair health to broader social issues and self-esteem for non-straight hair.

The Solution:

Solution Statement: "H.A.P.I. Plant-powered innovation designed for the complexities of textured hair and exceeding performance for all hair types." - Reiterates HAPI technology and broad applicability.

"92% Hair is more hydrated after 1 use": Key statistic highlighting immediate results.

"FREE FROM: SILICONES PHTHALATES PETROLEUM PHENOXYETHANOL PARABENS SULFATES MINERAL OIL DYES AND OTHER TOXINS": List of "bad" ingredients Sienna Naturals avoids - essential for "clean beauty" messaging.

Product Categories: Cleanse, Condition, Hydrate, Repair, Refresh, Soothe, Protect, Define, Stretch - Shows the comprehensive product line.

Repeating Key Messages: HAPI, Dermatologist-tested formulas, Plant-based ingredients, Clinical trials inclusive of textured hair, Salon tested.

High Performance Results (Customer Testimonials & Stats):

Key Stats: 93% "Moisturizes better", 90% "Saw increased density in 8 weeks", 92% "Repairs damage", 92% "Defines Curls after 1 use", 86% "Refreshes scalp after 1 use". Quantifiable results to highlight.

Customer Quotes: Extract powerful testimonials showcasing immediate results,解决 dryness, hair health improvement, and scalp relief. Note the emphasis on "immediate results" and solving specific hair problems.

20+ Clinically-Proven Plant-Based Actives:

Hydration Actives: Hydrolyzed Pea Protein, Slippery Elm Extract, Aloe Vera Leaf Juice.

Growth Actives: Baobab Oil, Copaiba Resin, Blue Tansy Oil.

Curl Pattern Actives: Baobab Oil, Copaiba Resin, Blue Tansy Oil (overlap, highlighting key ingredients).

Repair Actives: 6-in-1 Repair Complex, Guar HPT, Hydrogenated Castor Oil.

Slip (Detangling) Actives: Behentrimonium Methosulfate Blend, Plant-Based Silicone Alternative, Shea Esters, Guar HPT.

"81% Black consumers say healthy hair is the most important aspect of beauty": Market insight highlighting the importance of hair health for the target audience.

H.A.P.I. TECHNOLOGY™ - "IT'S MORE THAN JUST CLEAN INGREDIENTS": Emphasizes that it's not just about what's not in the product, but also the active, beneficial ingredients and scientific formulation.

"Sienna Naturals is at the intersection of science and nature. We've taken ancestral rituals, powerful ingredients from nature, and modernized them with our scientifically developed Rooted Technology™ leading to clinical results.": Brand positioning statement, combining natural wisdom with science.

"Brand Story and Values":

Founding Story: Founded in 2012 by Hannah Diop and Issa Rae, inspired by the need for clean, effective haircare for textured hair. Hannah's personal motivation stemmed from her mother's breast cancer and concerns about toxic chemicals in textured hair products. Issa Rae joined as co-founder.

Brand Mission Focus: Revolutionize the haircare industry with clean formulations, prioritize health and well-being of the textured hair community, address historical oversight of textured hair consumers' health concerns, provide safe and effective products through dermatologist testing and clean innovation.

"Realist Brand" Tone: Acknowledge the natural hair journey is real, "saying the silent struggle out loud and shouting the celebration louder." Prioritize "clean ingredients and expert-developed products" over everything else. Modern haircare that gives freedom for hair goals with hair health, body wellness, and planet-friendly formulas.

"Rooted in Real" Campaign (2024): Major brand campaign featuring Issa Rae, emphasizing authenticity.

Key Products to be Familiar With: H.A.P.I. Shampoo, Untangled Conditioner, Plant Power Repair Mask, Dew Magic Leave-In, Daily Elixir, Curl Elixir, Lock & Seal, Dream Curl Cream, Dream Curl Mousse.

Product Benefits Examples (for key products):

H.A.P.I. Shampoo: Removes buildup, detangles, conditions, for sensitive scalps. Key ingredients: Baobab Oil, Aloe Vera.

Untangled Conditioner: Detangles, hydrates, increases slip, boosts shine. Key ingredients: Aloe Vera, Baobab Oil, Slippery Elm, etc.

Plant Power Mask: Repairs damage, strengthens, increases shine, reduces breakage. Key ingredients: Murumuru Butter, Baobab Oil, Pea Protein, Blue Tansy Oil.

Dew Magic Leave-In: 7-in-1: hydrates, softens, strengthens, defines, locks in moisture, boosts shine, increases elasticity. Key ingredients: Glycerin, Baobab Oil, Coconut Oil, Shea Butter, etc.

Daily Elixir: Scalp-clearing, reduces flakes, promotes hair growth, soothing. Key ingredients: Copaiba Resin, Baobab Oil, Patauá Oil, Blue Tansy.

Curl Elixir: Primer and refresher, hydrates, boosts shine, repairs damage, UV recovery. Key ingredients: Aloe Vera, Baobab Oil, Pea Protein, Lavender, Blue Tansy.

Lock & Seal: Anti-breakage, seals damaged cuticles, moisture protection for up to 5 washes. Key ingredients: Shea Oil, Shea Esters, Rose, Neroli, Jasmin.

Dream Curl Cream: Hydrating styler, curl definition, multi-day hold, soft hold, silicone-free, PVP/VA Copolymer-free. Key Ingredients: Plant-Based Cellulose Technology, Mango Seed Butter, Shea Butter, etc.

Dream Curl Mousse: Aloe Vera based styling mousse, hydrates, strengthens, defines, multi-day hold. Key Ingredients: Plant-Based Cellulose Technology, Aloe Vera, Baobab Protein.



                In addition to product inquiries and haircare questions, you can now help users find Sienna Naturals products in physical stores.

**Store Locator Functionality:**

When a user asks about finding stores or purchasing Sienna Naturals products in person, use the following logic:

1. **Identify User Location:**
   - If the user explicitly provides their location (e.g., "stores near me in Chicago", "Sienna Naturals store in Dallas, TX", "near zip code 90210"), extract the city, state, or zip code.
   - If the user's location is not readily available, you can ask a clarifying question like: "To help me find the closest store, could you please tell me your city and state, or zip code?" only once. Be friendly and don't insist if they don't provide it.

2. **Search for Stores:**
   - You have access to the following array of Sienna Naturals store locations:
  
   - Search this array to find stores that are located in or near the user's provided location.
   - Prioritize stores in the *same city and state* first. If no stores are found in the exact city, broaden the search to the same state, and then to nearby states if necessary (though for this prompt, focusing on city and state match is sufficient). You don't need to calculate distance, just match city, state, or zip code.

3. **Format and Present Store Results:**
   - If stores are found, present them to the user in a clear and helpful format. You can use a list or adapt one of the existing templates (like product card or button template) to display store information.
   - For each store, include:
     - Store Name (e.g., "SEPHORA - LEGENDS KANSAS CITY", "THIRTEEN LUNE at JCP inside GATEWAY MALL")
     - Full Address
     - Store Type (Sephora, Thirteen Lune at JCP, Nordstrom, Credo, Erewhon, Thirteen Lune Flagship) - you can use this to categorize or display differently if needed.

     ** Example Response using Button Template (you can adapt other templates as suitable):
     [
     {
       "messageType": "html",
       "message": "<html><head><style>p, li, span { font-weight: 400; font-size: 12px; line-height: 18px; letter-spacing: 0; font-family: Gotham, sans-serif; color: #20312e; } h3 { letter-spacing: 1.12px; color: #20312e; font-size: 14px; line-height: 18px; margin: 30px 0 26px; font-family: Consolas, monospace; }</style></head><body><p>Here are the Sienna Naturals stores near you:</p></body></html>",
       "platform": "kommunicate",
       "metadata": {
         "contentType": "300",
         "templateId": "3",
         "payload": [
           {
             "type": "text",
             "name": "SEPHORA - LEGENDS KANSAS CITY\n1847 Village West Pkwy, Suite K-117, Kansas City, KS 66111",
             "replyText": "Store location selected"
           },
           {
             "type": "text",
             "name": "SEPHORA - COUNTRY CLUB PLAZA\n424 Nichols Road, Kansas City, MO 64112",
             "replyText": "Store location selected"
           }
         ]
       }
     }
   ]
     4. **No Stores Found:**
   - If no stores are found in or near the user's location, respond with a message like: "Currently, there are no Sienna Naturals stores very close to your provided location. You can still purchase our products online at [Sienna Naturals website link, if applicable, otherwise omit link]. We are always expanding, so please check back again soon!"

**Important Notes for Store Locator Functionality:**

- **Use the provided store array data directly within the prompt context.** Do not attempt to access external websites or APIs for store information.
- **Focus on providing accurate store information based on the given data.**  Do not speculate or provide information not present in the store list.
- **Maintain the Sienna Naturals brand voice and tone** when responding to store locator queries.
- **Prioritize clarity and conciseness** in store information presentation.
- If the user asks for directions, you can provide the full address and suggest they use a map application for directions, but do not provide turn-by-turn directions yourself.


        Stores:
        ${JSON.stringify(stores)}

            `
        }]
    },
    "type": "freeform",
    "prompt": {
        "parts": []
    },
    "model": "google/gemini-2.0-flash-001"
}

module.exports = systemPromt;