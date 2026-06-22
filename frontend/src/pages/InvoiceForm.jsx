import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Form, Button, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { apiFetch } from "../api";

// each row gets a front-end _key so React can track rows across add/remove. This is not the same as the backend id, which is only assigned after saving.

function blankItem() {
  return {
    _key: crypto.randomUUID(),
    gigRole: "",
    gigDescription: "",
    quantity: "",
    unitCost: "",
  };
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // present only on /invoices/:id/edit
  const isEdit = Boolean(id);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [term, setTerm] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState([blankItem()]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const clientData = await apiFetch("/clients");
        setClients(clientData.clients);

        if (isEdit) {
          const { invoice } = await apiFetch(`/invoices/${id}`);
          setClientId(String(invoice.clientId));
          setIssueDate(invoice.issueDate.slice(0, 10)); // ISO --> YYYY-MM-DD for the date input
          setDueDate(invoice.dueDate.slice(0, 10));
          setTaxRate(String(invoice.taxRate));
          setTerm(invoice.term ?? "");
          setNotes(invoice.notes ?? "");
          setLineItems(
            invoice.lineItems.length
              ? invoice.lineItems.map((li) => ({
                  _key: crypto.randomUUID(),
                  gigRole: li.gigRole ?? "",
                  gigDescription: li.gigDescription ?? "",
                  quantity: li.quantity ?? "",
                  unitCost: li.unitCost ?? "",
                }))
              : [blankItem()],
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  function updateItem(index, field, value) {
    setLineItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }
  function addItem() {
    setLineItems((prev) => [...prev, blankItem()]);
  }
  function removeItem(index) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unitCost || 0),
    0,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const items = lineItems
        .filter(
          (it) => it.gigRole || it.gigDescription || it.quantity || it.unitCost,
        )
        .map(({ _key, ...rest }) => rest);

      const body = {
        clientId,
        issueDate: issueDate || undefined,
        dueDate: dueDate || undefined,
        taxRate: taxRate || undefined,
        term: term || null,
        notes: notes || null,
        lineItems: items,
      };

      if (isEdit) {
        await apiFetch(`/invoices/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        navigate(`/invoices/${id}`); // back to the detail
      } else {
        await apiFetch("/invoices", {
          method: "PUT",
          body: JSON.stringify(body),
        });
        navigate("/invoices"); // back to the list
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner animation="border" />;

  return (
    <div>
      <h1 className="h3 mb-3">{isEdit ? "Edit invoice" : "New invoice"}</h1>
      {error && <Alert variant="danger">{error}</Alert>}

      {clients.length === 0 ? (
        <Alert variant="warning">
          You need a client first — add one on the Clients page.
        </Alert>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="clientId">
                <Form.Label>Client</Form.Label>
                <Form.Select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  <option value="">Select a client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3" controlId="issueDate">
                <Form.Label>Issue date</Form.Label>
                <Form.Control
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3" controlId="dueDate">
                <Form.Label>Due date</Form.Label>
                <Form.Control
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Line items</span>
              <Button size="sm" variant="outline-primary" onClick={addItem}>
                + Add line
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="fw-semibold mb-2 d-none d-md-flex">
                <Col md={3}>Role</Col>
                <Col md={4}>Description</Col>
                <Col md={2}>Qty</Col>
                <Col md={2}>Unit cost</Col>
                <Col md={1}></Col>
              </Row>
              {lineItems.map((item, index) => (
                <Row key={item._key} className="g-2 mb-2 align-items-center">
                  <Col xs={12} md={3}>
                    <Form.Control
                      placeholder="Role"
                      value={item.gigRole}
                      onChange={(e) =>
                        updateItem(index, "gigRole", e.target.value)
                      }
                    />
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Control
                      placeholder="Description"
                      value={item.gigDescription}
                      onChange={(e) =>
                        updateItem(index, "gigDescription", e.target.value)
                      }
                    />
                  </Col>
                  <Col xs={6} md={2}>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                    />
                  </Col>
                  <Col xs={6} md={2}>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit cost"
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(index, "unitCost", e.target.value)
                      }
                    />
                  </Col>
                  <Col xs={12} md={1}>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      ✕
                    </Button>
                  </Col>
                </Row>
              ))}
              <div className="text-end fw-semibold mt-2">
                Subtotal: ${subtotal.toFixed(2)}
              </div>
            </Card.Body>
          </Card>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3" controlId="taxRate">
                <Form.Label>Tax rate (%)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={9}>
              <Form.Group className="mb-3" controlId="term">
                <Form.Label>Terms</Form.Label>
                <Form.Control
                  placeholder="e.g. Net 30"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="notes">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Group>

          <div className="d-flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create draft"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(isEdit ? `/invoices/${id}` : "/invoices")}
            >
              Cancel
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
