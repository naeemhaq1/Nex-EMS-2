{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.postgresql
    pkgs.python3
  ];
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [pkgs.postgresql];
  };
}