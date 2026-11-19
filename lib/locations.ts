export type StudioLocation = {
  id: string;
  shortLabel: string;
  name: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode?: string;
  fullAddress: string;
  telephone: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  embedUrl: string;
  areaServed: string;
};

export const STUDIO_LOCATIONS: StudioLocation[] = [
  {
    id: 'branch-hanoi',
    shortLabel: 'Cơ sở 1 · Hà Nội',
    name: 'Merci Bridal - Váy cưới thiết kế cao cấp',
    streetAddress: '244 Đội Cấn',
    addressLocality: 'Ba Đình',
    addressRegion: 'Hà Nội',
    postalCode: '100000',
    fullAddress: '244 Đội Cấn, Ba Đình, Hà Nội',
    telephone: '+84888999545',
    lat: 21.035453,
    lng: 105.818115,
    mapsUrl:
      'https://www.google.com/maps/place/Merci+Bridal+-+V%C3%A1y+c%C6%B0%E1%BB%9Bi+thi%E1%BA%BFt+k%E1%BA%BF+cao+c%E1%BA%A5p/@21.035453,105.818115,17z/data=!3m1!4b1!4m6!3m5!1s0x31345333c61cf71d:0xa25352c3d16dd9a2!8m2!3d21.035453!4d105.818115!16s%2Fg%2F11mvmx3fl6',
    embedUrl:
      'https://maps.google.com/maps?q=Merci+Bridal+-+V%C3%A1y+c%C6%B0%E1%BB%9Bi+thi%E1%BA%BFt+k%E1%BA%BF+cao+c%E1%BA%A5p,+244+%C4%90%E1%BB%99i+C%E1%BA%A5n,+Ba+%C4%90%C3%ACnh,+H%C3%A0+N%E1%BB%99i&hl=vi&z=16&output=embed',
    areaServed: 'Hà Nội',
  },
  {
    id: 'branch-bacninh',
    shortLabel: 'Cơ sở 2 · Bắc Ninh',
    name: 'Merci Studio - Chụp ảnh top 1 Việt Yên',
    streetAddress: '650 Thân Nhân Trung',
    addressLocality: 'Việt Yên',
    addressRegion: 'Bắc Ninh',
    postalCode: '230000',
    fullAddress: '650 Thân Nhân Trung, Việt Yên, Bắc Ninh',
    telephone: '+84888999545',
    lat: 21.2790587,
    lng: 106.0914141,
    mapsUrl:
      'https://www.google.com/maps/place/Merci+Studio+-+Ch%E1%BB%A5p+%E1%BA%A3nh+top+1+Vi%E1%BB%87t+Y%C3%AAn/@21.2790587,106.0914141,17z/data=!3m1!4b1!4m6!3m5!1s0x31351333ac00ca59:0xc78ad3fe88b0a893!8m2!3d21.2790587!4d106.0914141!16s%2Fg%2F11yhqznr0f',
    embedUrl:
      'https://maps.google.com/maps?q=Merci+Studio+-+Ch%E1%BB%A5p+%E1%BA%A3nh+top+1+Vi%E1%BB%87t+Y%C3%AAn,+650+Th%C3%A2n+Nh%C3%A2n+Trung,+Vi%E1%BB%87t+Y%C3%AAn,+B%E1%BA%AFc+Ninh&hl=vi&z=16&output=embed',
    areaServed: 'Bắc Ninh',
  },
];
