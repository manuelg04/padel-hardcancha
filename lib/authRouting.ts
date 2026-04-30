type ClubAccess = {
  clubId: string;
  clubName: string;
  role: "club_master" | "club_staff";
};

export type CurrentUserAccess = {
  isSuperAdmin: boolean;
  clubAccess: ClubAccess[];
};

export function choosePostLoginPath(access: CurrentUserAccess) {
  if (access.isSuperAdmin) {
    return "/super-admin/clubes";
  }

  if (access.clubAccess.length > 0) {
    return "/admin/agenda";
  }

  return "/clubes";
}
