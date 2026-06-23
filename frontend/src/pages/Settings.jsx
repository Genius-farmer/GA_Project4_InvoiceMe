import { useState } from "react";
import { Form, Button, Row, Col, Card, Alert } from "react-bootstrap";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch } from "../api";

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    businessName: user?.businessName ?? "",
    businessEmail: user?.businessEmail ?? "",
    businessAddress: user?.businessAddress ?? "",
    phone: user?.phone ?? "",
    paymentInstructions: user?.paymentInstructions ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      updateUser(data.user);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Row className="justify-content-center">
      <Col md={9} lg={7}>
        <h1 className="h3 mb-3">Settings</h1>

        {saved && <Alert variant="success">Changes saved.</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <Card className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="displayName">
              <Form.Label>Display name</Form.Label>
              <Form.Control
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
                placeholder="Shown in the app only"
              />
            </Form.Group>

            <hr />
            <p className="text-muted mb-3">
              Business details — these appear as "Bill from" on your invoices.
              Leave a field blank to hide it.
            </p>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="businessName">
                  <Form.Label>Business name</Form.Label>
                  <Form.Control
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="businessEmail">
                  <Form.Label>Business email</Form.Label>
                  <Form.Control
                    type="email"
                    name="businessEmail"
                    value={form.businessEmail}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3" controlId="businessAddress">
              <Form.Label>Business address</Form.Label>
              <Form.Control
                name="businessAddress"
                value={form.businessAddress}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="phone">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="paymentInstructions">
              <Form.Label>Payment instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="paymentInstructions"
                value={form.paymentInstructions}
                onChange={handleChange}
                placeholder="e.g. PayNow to +65 9123 4567, or bank transfer to DBS 123-456789-0"
              />
            </Form.Group>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
