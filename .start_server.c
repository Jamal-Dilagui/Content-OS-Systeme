#include <unistd.h>
#include <stdlib.h>
extern char **environ;
int main() {
  pid_t pid = fork();
  if (pid < 0) exit(1);
  if (pid > 0) exit(0);
  setsid();
  pid = fork();
  if (pid < 0) exit(1);
  if (pid > 0) exit(0);
  chdir("/home/z/my-project");
  setenv("NODE_OPTIONS", "--max-old-space-size=640 --max-semi-space-size=64", 1);
  char *argv[] = {"./node_modules/.bin/next", "dev", "-p", "3000", "--webpack", NULL};
  execve("/home/z/my-project/node_modules/.bin/next", argv, environ);
  exit(1);
}
