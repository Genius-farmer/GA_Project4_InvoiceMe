import { useState, useEffect } from "react";
import { Table, Spinner, Alert, Button, Badge } from "react-bootstrap";
import { apiFetch } from "../api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/admin/users")
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function setActive(id, isActive) {
    try {
      const data = await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? data.user : u)),
      );
    } catch (err) {
      window.alert(err.message);
    }
  }

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h1 className="h3 mb-3">Admin · Users</h1>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Display name</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.displayName || <span className="text-muted">—</span>}</td>
              <td>{u.role}</td>
              <td>
                <Badge bg={u.isActive ? "success" : "secondary"}>
                  {u.isActive ? "active" : "banned"}
                </Badge>
              </td>
              <td>
                {u.role !== "admin" &&
                  (u.isActive ? (
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setActive(u.id, false)}
                    >
                      Ban
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline-success"
                      onClick={() => setActive(u.id, true)}
                    >
                      Unban
                    </Button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
