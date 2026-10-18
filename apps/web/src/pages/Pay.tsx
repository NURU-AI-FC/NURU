import { Navigate, Route, Routes } from 'react-router-dom'
import Beneficiaries from './pay/Beneficiaries'
import { Airtime, Bills } from './pay/Bills'
import Hub from './pay/Hub'
import Scan from './pay/Scan'
import Scheduled from './pay/Scheduled'
import Send from './pay/Send'

export default function Pay() {
  return (
    <Routes>
      <Route index element={<Hub />} />
      <Route path="send" element={<Send />} />
      <Route path="beneficiaries" element={<Beneficiaries />} />
      <Route path="bills" element={<Bills />} />
      <Route path="airtime" element={<Airtime />} />
      <Route path="scan" element={<Scan />} />
      <Route path="scheduled" element={<Scheduled />} />
      <Route path="*" element={<Navigate to="/pay" replace />} />
    </Routes>
  )
}
