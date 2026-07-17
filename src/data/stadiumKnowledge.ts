export interface StadiumKnowledgeBase {
  stadiumName: string;
  location: string;
  generalRules: {
    bagPolicy: string;
    reEntry: string;
    gateOpeningTimes: string;
    prohibitedItems: string[];
  };
  gates: {
    name: string;
    locationDescription: string;
    recommendedForSections: string[];
    accessibilityRoutes: string;
    generalWaitTimeInfo: string;
  }[];
  restrooms: {
    location: string;
    accessible: boolean;
    gender: string;
    directions: string;
  }[];
  foodConcessions: {
    name: string;
    location: string;
    cuisineType: string;
    veganOptions: boolean;
    popularItems: string[];
  }[];
  transitAndParking: {
    shuttles: string;
    uberLyftZone: string;
    publicTransit: string;
    parkingLots: string;
  };
}

export const stadiumKnowledge: StadiumKnowledgeBase = {
  stadiumName: "Dallas Stadium",
  location: "Arlington, Texas",
  generalRules: {
    bagPolicy: "Clear bag policy is strictly enforced. Only clear plastic, vinyl, or PVC bags that do not exceed 12\" x 6\" x 12\" are permitted. Small clutch bags (no larger than 4.5\" x 6.5\") are allowed with or without a handle or strap.",
    reEntry: "Re-entry is generally prohibited. Once you exit the stadium gates, you cannot re-enter with the same ticket unless there is an emergency clearance authorized by staff.",
    gateOpeningTimes: "All public gates open 2.5 hours prior to kickoff. Premium suite holders may enter 3 hours prior via the West VIP Entrance.",
    prohibitedItems: [
      "Large backpacks, suitcases, or duffel bags",
      "Outside food or beverages (except one sealed bottle of water up to 20oz for medical reasons)",
      "Professional cameras with detachable lenses longer than 3 inches",
      "Weapons of any kind, including pocket knives",
      "Noisy instruments, air horns, or whistles",
      "Banners or signs larger than 3' x 2'"
    ]
  },
  gates: [
    {
      name: "Gate A",
      locationDescription: "North-East Plaza near Lot 3",
      recommendedForSections: ["101-112", "201-210", "301-315"],
      accessibilityRoutes: "Ramps are located directly to the left of the main turnstiles. Elevators available inside the gate lobby.",
      generalWaitTimeInfo: "Tends to get highly congested 45 minutes before kickoff due to proximity to the main rideshare drop-off."
    },
    {
      name: "Gate B",
      locationDescription: "East Plaza adjacent to the Metro Shuttle Loop",
      recommendedForSections: ["113-125", "211-224", "316-330"],
      accessibilityRoutes: "Level-surface entry. Wheelchair assistance kiosk is located right inside the gate vestibule.",
      generalWaitTimeInfo: "Steady flow. Recommended alternative if Gate A is backed up."
    },
    {
      name: "Gate C",
      locationDescription: "South Plaza near Lot 10",
      recommendedForSections: ["126-138", "225-236", "331-345"],
      accessibilityRoutes: "Includes designated ADA-compliant entrance lanes on the far right side.",
      generalWaitTimeInfo: "Moderately busy. Quickest access for fans parking in the southern lots."
    },
    {
      name: "Gate D",
      locationDescription: "West Plaza near the Fan Zone",
      recommendedForSections: ["139-150", "237-250", "346-360"],
      accessibilityRoutes: "Ramp and lift options available. Level access to the lower concourse.",
      generalWaitTimeInfo: "Fastest general entry gate overall. Features double-width security queues."
    },
    {
      name: "VIP West",
      locationDescription: "West side, private drive access",
      recommendedForSections: ["Suites 1-50", "Club Level Seats C1-C20"],
      accessibilityRoutes: "Direct elevator access to all suite levels and premium club seating.",
      generalWaitTimeInfo: "Exclusive to VIP ticket holders. Extremely low wait times (< 2 minutes)."
    }
  ],
  restrooms: [
    {
      location: "Section 105",
      accessible: true,
      gender: "All-Gender / Family",
      directions: "Located behind the concession stand in Section 105, on the outer concourse loop."
    },
    {
      location: "Section 114",
      accessible: true,
      gender: "Men / Women",
      directions: "Adjacent to the Gate B entrance. Men's restroom is on the right, Women's restroom is on the left."
    },
    {
      location: "Section 203",
      accessible: false,
      gender: "Men / Women",
      directions: "Upper concourse level, halfway between Section 203 and 204."
    },
    {
      location: "Section 302",
      accessible: true,
      gender: "Men / Women",
      directions: "Top level, directly opposite Section 302 seating portal. Has an ADA-compliant wheelchair stall."
    },
    {
      location: "Section 324",
      accessible: true,
      gender: "All-Gender / Family",
      directions: "Near elevator bay E, behind Section 324. Includes changing tables."
    }
  ],
  foodConcessions: [
    {
      name: "Lone Star Grill",
      location: "Section 110",
      cuisineType: "Texas BBQ & Burgers",
      veganOptions: false,
      popularItems: ["Smoked Brisket Sandwich", "Jumbo Chili Cheese Fries", "Dr Pepper Glazed Ribs"]
    },
    {
      name: "Verde Cantina",
      location: "Section 122",
      cuisineType: "Tex-Mex",
      veganOptions: true,
      popularItems: ["Fajita Quesadillas", "Vegan Jackfruit Tacos", "Nachos Grande", "Frozen Margaritas (21+)"]
    },
    {
      name: "The Green Bowl",
      location: "Section 144 (Food Court)",
      cuisineType: "Healthy / Bowls / Salads",
      veganOptions: true,
      popularItems: ["Quinoa Protein Bowl", "Avocado & Chickpea Wrap", "Acai Berry Smoothie", "Vegan Burger"]
    },
    {
      name: "Merch & Munchies",
      location: "Section 312",
      cuisineType: "Stadium Snacks",
      veganOptions: true,
      popularItems: ["Giant Soft Pretzel", "Buttered Popcorn", "Hot Dogs", "Refillable Souvenir Soda"]
    }
  ],
  transitAndParking: {
    shuttles: "Free Metro Shuttles run continuously from 3 hours pre-match to 2 hours post-match. Pick-up and drop-off are located at the East Shuttle Loop, right outside Gate B.",
    uberLyftZone: "Rideshare pick-up and drop-off is strictly designated to Lot 15, which is located on the North-East side of the stadium (about a 7-minute walk from Gate A). Follow the glowing green 'Rideshare' signs.",
    publicTransit: "The Arlington Transit Link (ATL) train station is located 10 minutes walking distance from the South Gate C. Outbound trains run every 15 minutes after the match.",
    parkingLots: "Lot 1-5 are reserved for Suite and VIP pass holders. Lot 6-12 are general public parking ($40 online pre-paid, $50 drive-up). Parking lots close 2 hours after the match ends."
  }
};
