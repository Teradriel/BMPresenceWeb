# Backend API - Required Endpoints for Appointments

## Appointment Endpoints

### 1. Create Appointment

**POST** `/api/appointments`

**Request Body:**

```json
{
  "subject": "Luca Terzariol",
  "startTime": "2026-01-20T08:30:00.000Z",
  "endTime": "2026-01-20T09:30:00.000Z",
  "resourceIds": [1],
  "recurrenceRule": null
}
```

**Response:** (Status 201 Created)

```json
{
  "id": 1,
  "subject": "Luca Terzariol",
  "startTime": "2026-01-20T08:30:00.000Z",
  "endTime": "2026-01-20T09:30:00.000Z",
  "recurrenceRule": null,
  "active": true,
  "createdAt": "2026-01-28T10:00:00.000Z",
  "updatedAt": "2026-01-28T10:00:00.000Z",
  "resourceIds": [1]
}
```

---

### 2. Update Appointment

**PUT** `/api/appointments/:id`

**Request Body:** (all fields optional)

```json
{
  "subject": "Luca Terzariol",
  "startTime": "2026-01-20T08:30:00.000Z",
  "endTime": "2026-01-20T09:30:00.000Z",
  "resourceIds": [1],
  "recurrenceRule": null,
  "active": true
}
```

**Response:** (Status 200 OK)

```json
{
  "id": 1,
  "subject": "Luca Terzariol",
  "startTime": "2026-01-20T08:30:00.000Z",
  "endTime": "2026-01-20T09:30:00.000Z",
  "recurrenceRule": null,
  "active": true,
  "createdAt": "2026-01-28T10:00:00.000Z",
  "updatedAt": "2026-01-28T11:00:00.000Z",
  "resourceIds": [1]
}
```

---

### 3. Delete Appointment

**DELETE** `/api/appointments/:id`

**Response:** (Status 204 No Content or 200 OK)

```json
{
  "success": true,
  "message": "Appointment deleted successfully"
}
```

**Note:** Soft delete (set `active: false`) is recommended instead of hard deletion.

---

### 4. Get All Appointments (existing)

**GET** `/api/appointments`

**Response:** (Status 200 OK)

```json
[
  {
    "id": 1,
    "subject": "Luca Terzariol",
    "startTime": "2026-01-20T08:30:00.000Z",
    "endTime": "2026-01-20T09:30:00.000Z",
    "recurrenceRule": null,
    "active": true,
    "createdAt": "2026-01-28T10:00:00.000Z",
    "updatedAt": "2026-01-28T10:00:00.000Z",
    "resourceIds": [1]
  }
]
```

---

## Users Endpoint

### 5. Get All Users

**GET** `/api/users`

**Response:** (Status 200 OK)

```json
[
  {
    "id": "1",
    "username": "luca.terzariol",
    "email": "luca@example.com",
    "name": "Luca",
    "lastName": "Terzariol",
    "isAdmin": false,
    "active": true
  },
  {
    "id": "2",
    "username": "mario.rossi",
    "email": "mario@example.com",
    "name": "Mario",
    "lastName": "Rossi",
    "isAdmin": false,
    "active": true
  }
]
```

---

## Recommended Validations

### For Create/Update Appointments

1. **startTime** must be earlier than **endTime**
2. **resourceIds** must contain at least one valid resource
3. **subject** must not be empty
4. Check for schedule conflicts for the same resource
5. Date format must be ISO 8601 with UTC timezone

### Error Handling

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "startTime",
      "message": "Start time must be earlier than end time"
    }
  ]
}
```

---

## Suggested Database Model

### Table: appointments

```sql
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  recurrence_rule TEXT NULL,
  active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table: appointment_resources (many-to-many relation)

```sql
CREATE TABLE appointment_resources (
  appointment_id INT NOT NULL,
  resource_id INT NOT NULL,
  PRIMARY KEY (appointment_id, resource_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);
```

---

## Implementation Notes

1. **Timezone:** The frontend sends UTC timestamps using local time values. The backend must store them as-is without conversion.

2. **Soft Delete:** Implement logical deletion (`active: false`) to preserve history.

3. **Authentication:** All endpoints must be protected with JWT (except login/register).

4. **CORS:** Ensure the backend allows requests from the frontend origin.

5. **Resource Validation:** Verify that `resourceIds` exist and are active before create/update.
