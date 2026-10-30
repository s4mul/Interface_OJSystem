function GroupSelector({ groups, selectedGroupId, onChange }) {
  return (
    <section>
      <h2>그룹 선택</h2>
      <label htmlFor="group">그룹 </label>
      <select
        id="group"
        value={selectedGroupId}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
    </section>
  )
}

export default GroupSelector
