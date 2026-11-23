// The rooms a visitor can put behind their strip: the app's everyday shop rooms
// (YoMomma/YoMamma/Rewards/ShopCatalog.swift, without the holiday rooms), in shop order.
// The art is copied to public/rooms by scripts/import-assets.ts.

export const ROOMS = [
  { id: "bg_room", name: "Bedroom" },
  { id: "bg_library", name: "Library" },
  { id: "bg_coffeeShop", name: "Coffee shop" },
  { id: "bg_office", name: "Office" },
  { id: "bg_classroom", name: "Classroom" },
  { id: "bg_computerLab", name: "Computer lab" },
  { id: "bg_scienceLab", name: "Science lab" },
  { id: "bg_artStudio", name: "Art studio" },
  { id: "bg_musicRoom", name: "Music room" },
  { id: "bg_kitchen", name: "Kitchen" },
  { id: "bg_park", name: "Park" },
  { id: "bg_beach", name: "Beach" },
  { id: "bg_campsite", name: "Campsite" },
  { id: "bg_greenhouse", name: "Greenhouse" },
  { id: "bg_rooftop", name: "Rooftop" },
  { id: "bg_gym", name: "Gym" },
  { id: "bg_sportsField", name: "Sports field" },
  { id: "bg_train", name: "Train" },
  { id: "bg_western", name: "Western town" },
  { id: "bg_spaceStation", name: "Space station" },
] as const;

export type RoomId = (typeof ROOMS)[number]["id"];

export const roomPath = (id: RoomId) => `/rooms/${id}.svg`;

export const randomRoom = (): RoomId => ROOMS[Math.floor(Math.random() * ROOMS.length)].id;
