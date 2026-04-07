/**
 * GRF-01: Seed Country nodes
 * 249 ISO 3166-1 countries into FalkorDB + canonical_register in Neon.
 * Uses MERGE not CREATE — safe to rerun.
 */

import { readFileSync } from "fs"
import { FalkorDB } from "falkordb"
import { neon } from "@neondatabase/serverless"

// Load env
const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
for (const line of env.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) process.env[match[1]] = match[2].trim()
}

// ISO 3166-1 countries: [iso2, iso3, name, region]
const COUNTRIES = [
  ["AF","AFG","Afghanistan","Asia"],
  ["AL","ALB","Albania","Europe"],
  ["DZ","DZA","Algeria","Africa"],
  ["AD","AND","Andorra","Europe"],
  ["AO","AGO","Angola","Africa"],
  ["AG","ATG","Antigua and Barbuda","Americas"],
  ["AR","ARG","Argentina","Americas"],
  ["AM","ARM","Armenia","Asia"],
  ["AU","AUS","Australia","Oceania"],
  ["AT","AUT","Austria","Europe"],
  ["AZ","AZE","Azerbaijan","Asia"],
  ["BS","BHS","Bahamas","Americas"],
  ["BH","BHR","Bahrain","Asia"],
  ["BD","BGD","Bangladesh","Asia"],
  ["BB","BRB","Barbados","Americas"],
  ["BY","BLR","Belarus","Europe"],
  ["BE","BEL","Belgium","Europe"],
  ["BZ","BLZ","Belize","Americas"],
  ["BJ","BEN","Benin","Africa"],
  ["BT","BTN","Bhutan","Asia"],
  ["BO","BOL","Bolivia","Americas"],
  ["BA","BIH","Bosnia and Herzegovina","Europe"],
  ["BW","BWA","Botswana","Africa"],
  ["BR","BRA","Brazil","Americas"],
  ["BN","BRN","Brunei","Asia"],
  ["BG","BGR","Bulgaria","Europe"],
  ["BF","BFA","Burkina Faso","Africa"],
  ["BI","BDI","Burundi","Africa"],
  ["CV","CPV","Cabo Verde","Africa"],
  ["KH","KHM","Cambodia","Asia"],
  ["CM","CMR","Cameroon","Africa"],
  ["CA","CAN","Canada","Americas"],
  ["CF","CAF","Central African Republic","Africa"],
  ["TD","TCD","Chad","Africa"],
  ["CL","CHL","Chile","Americas"],
  ["CN","CHN","China","Asia"],
  ["CO","COL","Colombia","Americas"],
  ["KM","COM","Comoros","Africa"],
  ["CG","COG","Congo","Africa"],
  ["CD","COD","Congo (DRC)","Africa"],
  ["CR","CRI","Costa Rica","Americas"],
  ["HR","HRV","Croatia","Europe"],
  ["CU","CUB","Cuba","Americas"],
  ["CY","CYP","Cyprus","Europe"],
  ["CZ","CZE","Czechia","Europe"],
  ["DK","DNK","Denmark","Europe"],
  ["DJ","DJI","Djibouti","Africa"],
  ["DM","DMA","Dominica","Americas"],
  ["DO","DOM","Dominican Republic","Americas"],
  ["EC","ECU","Ecuador","Americas"],
  ["EG","EGY","Egypt","Africa"],
  ["SV","SLV","El Salvador","Americas"],
  ["GQ","GNQ","Equatorial Guinea","Africa"],
  ["ER","ERI","Eritrea","Africa"],
  ["EE","EST","Estonia","Europe"],
  ["SZ","SWZ","Eswatini","Africa"],
  ["ET","ETH","Ethiopia","Africa"],
  ["FJ","FJI","Fiji","Oceania"],
  ["FI","FIN","Finland","Europe"],
  ["FR","FRA","France","Europe"],
  ["GA","GAB","Gabon","Africa"],
  ["GM","GMB","Gambia","Africa"],
  ["GE","GEO","Georgia","Asia"],
  ["DE","DEU","Germany","Europe"],
  ["GH","GHA","Ghana","Africa"],
  ["GR","GRC","Greece","Europe"],
  ["GD","GRD","Grenada","Americas"],
  ["GT","GTM","Guatemala","Americas"],
  ["GN","GIN","Guinea","Africa"],
  ["GW","GNB","Guinea-Bissau","Africa"],
  ["GY","GUY","Guyana","Americas"],
  ["HT","HTI","Haiti","Americas"],
  ["HN","HND","Honduras","Americas"],
  ["HU","HUN","Hungary","Europe"],
  ["IS","ISL","Iceland","Europe"],
  ["IN","IND","India","Asia"],
  ["ID","IDN","Indonesia","Asia"],
  ["IR","IRN","Iran","Asia"],
  ["IQ","IRQ","Iraq","Asia"],
  ["IE","IRL","Ireland","Europe"],
  ["IL","ISR","Israel","Asia"],
  ["IT","ITA","Italy","Europe"],
  ["JM","JAM","Jamaica","Americas"],
  ["JP","JPN","Japan","Asia"],
  ["JO","JOR","Jordan","Asia"],
  ["KZ","KAZ","Kazakhstan","Asia"],
  ["KE","KEN","Kenya","Africa"],
  ["KI","KIR","Kiribati","Oceania"],
  ["KP","PRK","North Korea","Asia"],
  ["KR","KOR","South Korea","Asia"],
  ["KW","KWT","Kuwait","Asia"],
  ["KG","KGZ","Kyrgyzstan","Asia"],
  ["LA","LAO","Laos","Asia"],
  ["LV","LVA","Latvia","Europe"],
  ["LB","LBN","Lebanon","Asia"],
  ["LS","LSO","Lesotho","Africa"],
  ["LR","LBR","Liberia","Africa"],
  ["LY","LBY","Libya","Africa"],
  ["LI","LIE","Liechtenstein","Europe"],
  ["LT","LTU","Lithuania","Europe"],
  ["LU","LUX","Luxembourg","Europe"],
  ["MG","MDG","Madagascar","Africa"],
  ["MW","MWI","Malawi","Africa"],
  ["MY","MYS","Malaysia","Asia"],
  ["MV","MDV","Maldives","Asia"],
  ["ML","MLI","Mali","Africa"],
  ["MT","MLT","Malta","Europe"],
  ["MH","MHL","Marshall Islands","Oceania"],
  ["MR","MRT","Mauritania","Africa"],
  ["MU","MUS","Mauritius","Africa"],
  ["MX","MEX","Mexico","Americas"],
  ["FM","FSM","Micronesia","Oceania"],
  ["MD","MDA","Moldova","Europe"],
  ["MC","MCO","Monaco","Europe"],
  ["MN","MNG","Mongolia","Asia"],
  ["ME","MNE","Montenegro","Europe"],
  ["MA","MAR","Morocco","Africa"],
  ["MZ","MOZ","Mozambique","Africa"],
  ["MM","MMR","Myanmar","Asia"],
  ["NA","NAM","Namibia","Africa"],
  ["NR","NRU","Nauru","Oceania"],
  ["NP","NPL","Nepal","Asia"],
  ["NL","NLD","Netherlands","Europe"],
  ["NZ","NZL","New Zealand","Oceania"],
  ["NI","NIC","Nicaragua","Americas"],
  ["NE","NER","Niger","Africa"],
  ["NG","NGA","Nigeria","Africa"],
  ["MK","MKD","North Macedonia","Europe"],
  ["NO","NOR","Norway","Europe"],
  ["OM","OMN","Oman","Asia"],
  ["PK","PAK","Pakistan","Asia"],
  ["PW","PLW","Palau","Oceania"],
  ["PA","PAN","Panama","Americas"],
  ["PG","PNG","Papua New Guinea","Oceania"],
  ["PY","PRY","Paraguay","Americas"],
  ["PE","PER","Peru","Americas"],
  ["PH","PHL","Philippines","Asia"],
  ["PL","POL","Poland","Europe"],
  ["PT","PRT","Portugal","Europe"],
  ["QA","QAT","Qatar","Asia"],
  ["RO","ROU","Romania","Europe"],
  ["RU","RUS","Russia","Europe"],
  ["RW","RWA","Rwanda","Africa"],
  ["KN","KNA","Saint Kitts and Nevis","Americas"],
  ["LC","LCA","Saint Lucia","Americas"],
  ["VC","VCT","Saint Vincent and the Grenadines","Americas"],
  ["WS","WSM","Samoa","Oceania"],
  ["SM","SMR","San Marino","Europe"],
  ["ST","STP","Sao Tome and Principe","Africa"],
  ["SA","SAU","Saudi Arabia","Asia"],
  ["SN","SEN","Senegal","Africa"],
  ["RS","SRB","Serbia","Europe"],
  ["SC","SYC","Seychelles","Africa"],
  ["SL","SLE","Sierra Leone","Africa"],
  ["SG","SGP","Singapore","Asia"],
  ["SK","SVK","Slovakia","Europe"],
  ["SI","SVN","Slovenia","Europe"],
  ["SB","SLB","Solomon Islands","Oceania"],
  ["SO","SOM","Somalia","Africa"],
  ["ZA","ZAF","South Africa","Africa"],
  ["SS","SSD","South Sudan","Africa"],
  ["ES","ESP","Spain","Europe"],
  ["LK","LKA","Sri Lanka","Asia"],
  ["SD","SDN","Sudan","Africa"],
  ["SR","SUR","Suriname","Americas"],
  ["SE","SWE","Sweden","Europe"],
  ["CH","CHE","Switzerland","Europe"],
  ["SY","SYR","Syria","Asia"],
  ["TW","TWN","Taiwan","Asia"],
  ["TJ","TJK","Tajikistan","Asia"],
  ["TZ","TZA","Tanzania","Africa"],
  ["TH","THA","Thailand","Asia"],
  ["TL","TLS","Timor-Leste","Asia"],
  ["TG","TGO","Togo","Africa"],
  ["TO","TON","Tonga","Oceania"],
  ["TT","TTO","Trinidad and Tobago","Americas"],
  ["TN","TUN","Tunisia","Africa"],
  ["TR","TUR","Turkey","Asia"],
  ["TM","TKM","Turkmenistan","Asia"],
  ["TV","TUV","Tuvalu","Oceania"],
  ["UG","UGA","Uganda","Africa"],
  ["UA","UKR","Ukraine","Europe"],
  ["AE","ARE","United Arab Emirates","Asia"],
  ["GB","GBR","United Kingdom","Europe"],
  ["US","USA","United States","Americas"],
  ["UY","URY","Uruguay","Americas"],
  ["UZ","UZB","Uzbekistan","Asia"],
  ["VU","VUT","Vanuatu","Oceania"],
  ["VE","VEN","Venezuela","Americas"],
  ["VN","VNM","Vietnam","Asia"],
  ["YE","YEM","Yemen","Asia"],
  ["ZM","ZMB","Zambia","Africa"],
  ["ZW","ZWE","Zimbabwe","Africa"],
  // Smaller/disputed territories included in ISO 3166-1
  ["AX","ALA","Åland Islands","Europe"],
  ["AS","ASM","American Samoa","Oceania"],
  ["AI","AIA","Anguilla","Americas"],
  ["AQ","ATA","Antarctica","Antarctica"],
  ["AG","ATG","Antigua and Barbuda","Americas"],
  ["AW","ABW","Aruba","Americas"],
  ["BM","BMU","Bermuda","Americas"],
  ["BQ","BES","Bonaire, Sint Eustatius and Saba","Americas"],
  ["IO","IOT","British Indian Ocean Territory","Asia"],
  ["VG","VGB","British Virgin Islands","Americas"],
  ["KY","CYM","Cayman Islands","Americas"],
  ["CX","CXR","Christmas Island","Oceania"],
  ["CC","CCK","Cocos (Keeling) Islands","Oceania"],
  ["CK","COK","Cook Islands","Oceania"],
  ["CW","CUW","Curaçao","Americas"],
  ["FK","FLK","Falkland Islands","Americas"],
  ["FO","FRO","Faroe Islands","Europe"],
  ["GF","GUF","French Guiana","Americas"],
  ["PF","PYF","French Polynesia","Oceania"],
  ["TF","ATF","French Southern Territories","Antarctica"],
  ["GI","GIB","Gibraltar","Europe"],
  ["GL","GRL","Greenland","Americas"],
  ["GP","GLP","Guadeloupe","Americas"],
  ["GU","GUM","Guam","Oceania"],
  ["GG","GGY","Guernsey","Europe"],
  ["HM","HMD","Heard Island and McDonald Islands","Antarctica"],
  ["HK","HKG","Hong Kong","Asia"],
  ["IM","IMN","Isle of Man","Europe"],
  ["JE","JEY","Jersey","Europe"],
  ["MO","MAC","Macao","Asia"],
  ["MQ","MTQ","Martinique","Americas"],
  ["YT","MYT","Mayotte","Africa"],
  ["MS","MSR","Montserrat","Americas"],
  ["NC","NCL","New Caledonia","Oceania"],
  ["NF","NFK","Norfolk Island","Oceania"],
  ["MP","MNP","Northern Mariana Islands","Oceania"],
  ["NU","NIU","Niue","Oceania"],
  ["PS","PSE","Palestine","Asia"],
  ["PN","PCN","Pitcairn","Oceania"],
  ["PR","PRI","Puerto Rico","Americas"],
  ["RE","REU","Réunion","Africa"],
  ["BL","BLM","Saint Barthélemy","Americas"],
  ["SH","SHN","Saint Helena","Africa"],
  ["MF","MAF","Saint Martin (French part)","Americas"],
  ["PM","SPM","Saint Pierre and Miquelon","Americas"],
  ["SX","SXM","Sint Maarten (Dutch part)","Americas"],
  ["GS","SGS","South Georgia and South Sandwich Islands","Antarctica"],
  ["SJ","SJM","Svalbard and Jan Mayen","Europe"],
  ["TK","TKL","Tokelau","Oceania"],
  ["TC","TCA","Turks and Caicos Islands","Americas"],
  ["UM","UMI","United States Minor Outlying Islands","Oceania"],
  ["VI","VIR","United States Virgin Islands","Americas"],
  ["WF","WLF","Wallis and Futuna","Oceania"],
  ["EH","ESH","Western Sahara","Africa"],
  ["XK","XKX","Kosovo","Europe"],
]

async function main() {
  const db = neon(process.env.DATABASE_URL)
  const graph = await FalkorDB.connect({
    username: process.env.FALKORDB_USERNAME,
    password: process.env.FALKORDB_PASSWORD,
    socket: {
      host: process.env.FALKORDB_HOST,
      port: parseInt(process.env.FALKORDB_PORT),
    },
  })
  const g = graph.selectGraph("bigbrain")

  console.log(`Seeding ${COUNTRIES.length} countries...`)
  let seeded = 0
  let skipped = 0

  for (const [iso2, iso3, name, region] of COUNTRIES) {
    const dedupKey = `country:${iso2}`
    const description = `${name} (${iso2}) — sovereign state or territory in ${region}.`

    // MERGE in FalkorDB
    const result = await g.query(
      `MERGE (c:Country {iso2: $iso2})
       ON CREATE SET
         c.id = randomUUID(),
         c.iso3 = $iso3,
         c.name = $name,
         c.region = $region,
         c.description = $description,
         c.source = 'SEED_ISO3166',
         c.file_ref = 'seed-countries.mjs',
         c.createdAt = timestamp(),
         c.updatedAt = timestamp()
       ON MATCH SET
         c.updatedAt = timestamp()
       RETURN c.id AS nodeId, c.name AS name`,
      { params: { iso2, iso3, name, region, description } }
    )

    const nodeId = result.data?.[0]?.nodeId

    // Upsert canonical_register in Neon
    await db`
      INSERT INTO canonical_register (entity_type, canonical_name, variations, dedup_key, graph_node_id)
      VALUES ('Country', ${name}, ${[iso2, iso3]}, ${dedupKey}, ${nodeId ?? null})
      ON CONFLICT (dedup_key) DO UPDATE SET
        graph_node_id = EXCLUDED.graph_node_id,
        updated_at = now()
    `

    seeded++
    if (seeded % 50 === 0) console.log(`  ${seeded}/${COUNTRIES.length}...`)
  }

  console.log(`Done. Seeded: ${seeded}, Skipped: ${skipped}`)
  await graph.close()
}

main().catch(err => { console.error(err); process.exit(1) })
