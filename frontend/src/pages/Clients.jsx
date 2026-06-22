import { useState, useEffect } from "react";
import { Table, Spinner, Alert, Button, Modal, Form } from "react-bootstrap";
import { apiFetch } from "../api";

const EMPTY = { companyName: "", companyEmail: "", billingAddress: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // shared modal state -> shared by create & edit.
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create, id = edit
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // fetch the logged-in user's clients once, on mount
  useEffect(() => {
    apiFetch("/clients")
      .then((data) => setClients(data.clients))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError("");
    setShow(true);
  }

  function openEdit(client) {
    setEditingId(client.id);
    setForm({
      companyName: client.companyName,
      companyEmail: client.companyEmail,
      billingAddress: client.billingAddress,
    });
    setFormError("");
    setShow(true);
  }

  // one handler for every field
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editingId) {
        const data = await apiFetch(`/clients/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setClients((prev) =>
          prev.map((c) => (c.id === editingId ? data.client : c)),
        ); // replace row
      } else {
        const data = await apiFetch("/clients", {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setClients((prev) => [...prev, data.client]); // add the new row to the table ( append row )
      }
      setShow(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this client?")) return;
    try {
      await apiFetch(`/clients/${id}`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== id)); // drop row
    } catch (err) {
      window.alert(err.message);
    }
  }

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Clients</h1>
        <Button onClick={openCreate}>New client</Button>
      </div>

      {clients.length === 0 ? (
        <p className="text-muted">No clients yet - add your first one. </p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Company</th>
              <th>Email</th>
              <th>Billing Address</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.companyName}</td>
                <td>{client.companyEmail}</td>
                <td>{client.billingAddress}</td>
                <td className="text-nowrap">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="me-2"
                    onClick={() => openEdit(client)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(client.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={show} onHide={() => setShow(false)}>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingId ? "Edit client" : "New client"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form.Group className="mb-3" controlId="companyName">
              <Form.Label>Company name</Form.Label>
              <Form.Control
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="companyEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="companyEmail"
                value={form.companyEmail}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="billingAddress">
              <Form.Label>Billing address</Form.Label>
              <Form.Control
                name="billingAddress"
                value={form.billingAddress}
                onChange={handleChange}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Create client"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
