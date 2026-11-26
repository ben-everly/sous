CREATE TRIGGER auth_users_handle_new
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.auth_users_handle_new();
