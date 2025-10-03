// src/services/sageKnowledge.ts
// Built-in agricultural knowledge base for Sage (no API needed)

export const FARMING_KNOWLEDGE = {
  pests: {
    aphids: {
      symptoms: "Clusters of small soft-bodied insects, sticky honeydew, curled leaves",
      solutions: [
        "Spray with neem oil (2-3 tbsp per gallon)",
        "Use insecticidal soap spray",
        "Introduce ladybugs or lacewings",
        "Strong water spray to dislodge them",
        "Yellow sticky traps near affected areas"
      ],
      prevention: "Monitor regularly, maintain good airflow, avoid over-fertilizing with nitrogen"
    },
    "spider mites": {
      symptoms: "Fine webbing, yellow stippling on leaves, tiny moving dots on undersides",
      solutions: [
        "Spray with miticide or neem oil",
        "Increase humidity (they hate moisture)",
        "Predatory mites (Phytoseiulus persimilis)",
        "Wipe leaves with rubbing alcohol solution (1:1 with water)",
        "Remove heavily infested leaves"
      ],
      prevention: "Keep humidity at 40-60%, regular leaf inspection, quarantine new plants"
    },
    thrips: {
      symptoms: "Silver/bronze streaks on leaves, deformed growth, black specks (droppings)",
      solutions: [
        "Blue sticky traps (thrips prefer blue)",
        "Spinosad spray (organic option)",
        "Predatory mites (Amblyseius cucumeris)",
        "Insecticidal soap with pyrethrin",
        "Remove affected flowers/buds"
      ],
      prevention: "Screen intakes with fine mesh, inspect new plants, remove plant debris"
    },
    whiteflies: {
      symptoms: "White flying insects when disturbed, sticky honeydew, yellowing leaves",
      solutions: [
        "Yellow sticky traps",
        "Vacuum adults off plants (really!)",
        "Neem oil or horticultural oil",
        "Parasitic wasps (Encarsia formosa)",
        "Reflective mulches to confuse them"
      ],
      prevention: "Quarantine new plants, regular monitoring, maintain beneficial insects"
    },
    "fungus gnats": {
      symptoms: "Small flies around soil, larvae in growing medium, slow growth",
      solutions: [
        "Let growing medium dry between waterings",
        "Sticky traps for adults",
        "BTI (mosquito dunks) for larvae",
        "Sand layer on top of medium",
        "Hydrogen peroxide soil drench (1:4 with water)"
      ],
      prevention: "Avoid overwatering, use sterile growing medium, good drainage"
    }
  },
  
  diseases: {
    "powdery mildew": {
      symptoms: "White powdery coating on leaves, distorted growth, yellowing",
      solutions: [
        "Improve air circulation immediately",
        "Reduce humidity below 50%",
        "Spray with potassium bicarbonate (1 tbsp/gallon)",
        "Neem oil application",
        "Remove affected leaves"
      ],
      prevention: "Space plants properly, maintain 40-50% humidity, avoid overhead watering"
    },
    "root rot": {
      symptoms: "Wilting despite moisture, brown/mushy roots, foul smell, yellowing",
      solutions: [
        "Remove plant and trim affected roots",
        "Treat with hydrogen peroxide (3%)",
        "Repot in sterile medium",
        "Apply beneficial bacteria (Bacillus subtilis)",
        "Reduce watering frequency"
      ],
      prevention: "Ensure proper drainage, avoid overwatering, maintain dissolved oxygen in nutrients"
    },
    "leaf spot": {
      symptoms: "Brown/black spots with yellow halos, spots may merge, leaf drop",
      solutions: [
        "Remove affected leaves immediately",
        "Improve air circulation",
        "Copper fungicide spray",
        "Avoid overhead watering",
        "Space plants for airflow"
      ],
      prevention: "Water at base only, morning watering, resistant varieties"
    }
  },
  
  nutrients: {
    nitrogen: {
      deficiency: "Lower leaves yellow first, slow growth, pale green color",
      excess: "Dark green leaves, delayed flowering, soft growth susceptible to pests",
      solutions: "Adjust nutrient solution, check pH (5.5-6.5), add calcium nitrate if deficient"
    },
    phosphorus: {
      deficiency: "Purple/red tints on leaves, slow growth, poor root development",
      excess: "Interferes with zinc and iron uptake, leaf tip burn",
      solutions: "Check pH (too high locks out P), add monopotassium phosphate if needed"
    },
    potassium: {
      deficiency: "Brown leaf edges (burn), weak stems, poor fruit quality",
      excess: "Interferes with magnesium and calcium uptake",
      solutions: "Add potassium sulfate, ensure proper EC levels"
    },
    calcium: {
      deficiency: "Blossom end rot in tomatoes, tip burn in lettuce, distorted new growth",
      excess: "Rare, but can lock out other nutrients",
      solutions: "Add calcium chloride, check pH, ensure adequate transpiration"
    },
    magnesium: {
      deficiency: "Interveinal chlorosis (yellowing between veins), starts with older leaves",
      excess: "Rare in hydroponics",
      solutions: "Foliar spray with Epsom salts (1 tsp/gallon), add to nutrient solution"
    },
    iron: {
      deficiency: "New leaves yellow with green veins, interveinal chlorosis",
      excess: "Bronze spotting on leaves",
      solutions: "Lower pH to 5.5-6.0, add chelated iron, check for root problems"
    }
  },
  
  environmental: {
    temperature: {
      "too hot": "Wilting, flower drop, bolting in leafy greens, reduced yields",
      "too cold": "Slow growth, purple coloration, poor germination",
      optimal: "Most crops: 65-75°F (18-24°C) day, 5-10°F cooler at night"
    },
    humidity: {
      "too high": "Fungal diseases, poor pollination, edema, reduced transpiration",
      "too low": "Excessive transpiration, wilting, spider mites, poor growth",
      optimal: "Vegetative: 60-70%, Flowering: 40-50%, Seedlings: 65-75%"
    },
    light: {
      "too much": "Bleaching, leaf burn, wilting despite water",
      "too little": "Stretching (etiolation), pale color, poor yields",
      optimal: "Leafy greens: 12-16 hrs, Fruiting: 14-18 hrs, DLI varies by crop"
    },
    pH: {
      "too high": "Iron/manganese lockout, yellowing new growth",
      "too low": "Calcium/magnesium lockout, aluminum toxicity",
      optimal: "Most crops: 5.8-6.2, Lettuce: 5.5-6.0, Tomatoes: 5.5-6.5"
    },
    EC: {
      "too high": "Nutrient burn, wilting, reduced water uptake",
      "too low": "Deficiencies, poor growth, low yields",
      optimal: "Lettuce: 0.8-1.2, Herbs: 1.0-1.6, Tomatoes: 2.0-3.5"
    }
  },
  
  crops: {
    lettuce: {
      varieties: ["Buttercrunch", "Romaine", "Oak Leaf", "Bibb"],
      germination: "2-7 days at 60-68°F",
      "days to harvest": "30-45 days from transplant",
      spacing: "6-8 inches apart",
      tips: "Keep cool, harvest in morning, successive plantings every 2 weeks"
    },
    tomatoes: {
      varieties: ["Cherry", "Beefsteak", "Roma", "Heirloom"],
      germination: "5-10 days at 70-80°F",
      "days to harvest": "60-85 days from transplant",
      spacing: "18-24 inches apart",
      tips: "Prune suckers, support with stakes, hand pollinate indoors"
    },
    basil: {
      varieties: ["Genovese", "Thai", "Purple Ruffles", "Lemon"],
      germination: "5-10 days at 70-75°F",
      "days to harvest": "25-35 days for first harvest",
      spacing: "6-12 inches apart",
      tips: "Pinch flowers, harvest frequently, don't overwater"
    },
    spinach: {
      varieties: ["Bloomsdale", "Space", "Regiment"],
      germination: "7-14 days at 50-60°F",
      "days to harvest": "40-50 days",
      spacing: "4-6 inches apart",
      tips: "Cool season crop, bolt resistant varieties for indoor growing"
    }
  }
};