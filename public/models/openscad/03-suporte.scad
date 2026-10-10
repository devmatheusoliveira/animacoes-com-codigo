$fn = 96;

difference() {
  cube([64, 44, 10], center = true);
  cylinder(h = 12, d = 18, center = true);
  for (x = [-23, 23])
    translate([x, 0, 0])
      cylinder(h = 12, d = 6, center = true);
}
